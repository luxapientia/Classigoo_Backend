import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Message } from './schemas/message.schema';
import { MessageRoom } from './schemas/message-room.schema';
import { MessageRoomUser } from './schemas/message-room-user.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { User } from '../../auth/schemas/user.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { StartChatDto } from './dto/start-chat.dto';
import { ListMessageRecipientsResponse } from './dto/list-message-recipients.dto';
import { MessageResponse } from './dto/get-room-messages.dto';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { FileService } from '../../../shared/services/file.service';
import { DeleteFileDto } from './dto/delete-file.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(MessageRoom.name) private messageRoomModel: Model<MessageRoom>,
    @InjectModel(MessageRoomUser.name) private messageRoomUserModel: Model<MessageRoomUser>,
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    @InjectModel(User.name) private userModel: Model<User>,
    private pubsubService: PubSubService,
    private fileService: FileService,
  ) {}

  async sendMessage(sendMessageDto: SendMessageDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      // Check if classroom exists
      const classroom = await this.classroomModel.findById(sendMessageDto.class_id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is a member of the classroom
      const classroomMember = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(sendMessageDto.class_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!classroomMember) {
        throw new UnauthorizedException('You are not a member of this classroom');
      }

      // Check if message room exists
      const messageRoom = await this.messageRoomModel.findById(sendMessageDto.room_id);
      if (!messageRoom) {
        throw new NotFoundException('Message room not found');
      }

      // Check if user is a member of the message room
      const roomMember = await this.messageRoomUserModel.findOne({
        room_id: new Types.ObjectId(sendMessageDto.room_id),
        user_id: new Types.ObjectId(user.user_id)
      });

      if (messageRoom?.type === 'single' && !roomMember) {
        throw new UnauthorizedException('You are not a member of this chat room');
      }

      // Create message
      await this.messageModel.create({
        room_id: new Types.ObjectId(sendMessageDto.room_id),
        user_id: new Types.ObjectId(user.user_id),
        content: sendMessageDto.message
      });

      // publish event
      await this.pubsubService.publish('message.created', {
        id: sendMessageDto.room_id,
      })

      // Update room's active_at timestamp
      await this.messageRoomModel.findByIdAndUpdate(sendMessageDto.room_id, {
        active_at: new Date()
      });

      return {
        status: 'success',
        message: 'Message sent successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not send message');
    }
  }

  async deleteMessage(messageId: string, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      const message = await this.messageModel.findById(messageId);
      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Check if user owns the message
      if (message.user_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You can only delete your own messages');
      }

      const result = await this.messageModel.findByIdAndDelete(messageId);
      if (!result) {
        throw new InternalServerErrorException('Failed to delete message');
      }

      // publish event
      await this.pubsubService.publish('message.deleted', {
        id: messageId,
        room_id: message.room_id.toString()
      })

      return { status: "success", message: "Successfully delete the message" };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete message');
    }
  }

  async startChat(startChatDto: StartChatDto, user: JwtPayload): Promise<{ status: string; message: string; id: string }> {
    try {
      // Check if both users exist
      const [user1, user2] = await Promise.all([
        this.userModel.findById(user.user_id),
        this.userModel.findById(startChatDto.with_user)
      ]);

      if (!user1 || !user2) {
        throw new NotFoundException('One or both users not found');
      }

      // Check if classroom exists
      const classroom = await this.classroomModel.findById(startChatDto.classroom_id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if both users are members of the classroom
      const [user1Access, user2Access] = await Promise.all([
        this.classroomAccessModel.findOne({
          class_id: new Types.ObjectId(startChatDto.classroom_id),
          user_id: new Types.ObjectId(user.user_id),
          status: 'accepted'
        }),
        this.classroomAccessModel.findOne({
          class_id: new Types.ObjectId(startChatDto.classroom_id),
          user_id: new Types.ObjectId(startChatDto.with_user),
          status: 'accepted'
        })
      ]);

      if (!user1Access || !user2Access) {
        throw new UnauthorizedException('One or both users are not members of the classroom');
      }

      // Find if there's any room where both users are members
      const existingChat = await this.messageRoomUserModel.aggregate([
        {
          $match: {
            user_id: new Types.ObjectId(user.user_id)
          }
        },
        {
          $lookup: {
            from: 'message_room_users',
            let: { roomId: '$room_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$room_id', '$$roomId'] },
                      { $eq: ['$user_id', new Types.ObjectId(startChatDto.with_user)] }
                    ]
                  }
                }
              }
            ],
            as: 'otherUser'
          }
        },
        {
          $match: {
            'otherUser.0': { $exists: true }
          }
        },
        {
          $lookup: {
            from: 'message_rooms',
            localField: 'room_id',
            foreignField: '_id',
            as: 'room'
          }
        },
        {
          $match: {
            'room.classroom_id': new Types.ObjectId(startChatDto.classroom_id),
            'room.type': 'single'
          }
        }
      ]);

      if (existingChat.length > 0) {
        throw new BadRequestException('Chat room already exists between these users');
      }

      // Create new chat room
      const chatRoom = await this.messageRoomModel.create({
        name: 'single',
        type: 'single',
        classroom_id: new Types.ObjectId(startChatDto.classroom_id),
        active_at: new Date()
      }) as MessageRoom & { _id: Types.ObjectId };

      // Add users to chat room
      await Promise.all([
        this.messageRoomUserModel.create({
          room_id: chatRoom._id,
          user_id: new Types.ObjectId(user.user_id)
        }),
        this.messageRoomUserModel.create({
          room_id: chatRoom._id,
          user_id: new Types.ObjectId(startChatDto.with_user)
        })
      ]);

      // Add initial system message
      await this.messageModel.create({
        room_id: chatRoom._id,
        user_id: new Types.ObjectId(user.user_id),
        content: { type: 'system', text: 'Chat initiated' }
      });

      // publish event
      await this.pubsubService.publish('chatroom.created', {
        class_id: startChatDto.classroom_id,
        room_id: chatRoom._id.toString(),
      })

      return {
        id: chatRoom._id.toString(),
        status: 'success',
        message: 'Chat initiated'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not start chat');
    }
  }

  async listMessageRecipients(classroomId: string, user: JwtPayload): Promise<ListMessageRecipientsResponse[]> {
    try {
      // Check if user is a member of the classroom
      const classroomMember = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(classroomId),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!classroomMember) {
        throw new UnauthorizedException('You are not a member of this classroom');
      }

      const messageRooms = await this.messageRoomModel.aggregate<ListMessageRecipientsResponse>([
        {
          $match: {
            classroom_id: new Types.ObjectId(classroomId)
          }
        },
        {
          $lookup: {
            from: 'message_room_users',
            localField: '_id',
            foreignField: 'room_id',
            as: 'users'
          }
        },
        {
          $unwind: {
            path: '$users',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'users.user_id',
            foreignField: '_id',
            as: 'users.user'
          }
        },
        {
          $unwind: {
            path: '$users.user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'classroom_access',
            let: { 
              userId: '$users.user._id',
              classId: '$classroom_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$user_id', '$$userId'] },
                      { $eq: ['$class_id', '$$classId'] }
                    ]
                  }
                }
              }
            ],
            as: 'classroom_access'
          }
        },
        {
          $unwind: {
            path: '$classroom_access',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            type: { $first: '$type' },
            users: {
              $push: {
                id: '$users._id',
                user: {
                  id: '$users.user._id',
                  name: '$users.user.name',
                  email: '$users.user.email',
                  avatar: '$users.user.avatar',
                  role: '$classroom_access.role'
                }
              }
            }
          }
        },
        {
          $match: {
            $or: [
              { type: 'all' },
              {
                users: {
                  $elemMatch: {
                    'user.id': new Types.ObjectId(user.user_id)
                  }
                }
              }
            ]
          }
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            name: 1,
            type: 1,
            users: 1
          }
        },
        {
          $sort: {
            'updated_at': -1
          }
        }
      ]);

      if (!messageRooms.length) {
        return [];
      }

      return messageRooms;
    } catch {
      throw new InternalServerErrorException('Could not fetch message recipients');
    }
  }

  async getRoomMessages(roomId: string, limit: number, offset: number, user: JwtPayload): Promise<{ messages: MessageResponse[] }> {
    try {
      // check if room is single
      const room = await this.messageRoomModel.findById(roomId);

      // Check if user is a member of the room
      const roomMember = await this.messageRoomUserModel.findOne({
        room_id: new Types.ObjectId(roomId),
        user_id: new Types.ObjectId(user.user_id)
      });

      if (room?.type === 'single' && !roomMember) {
        throw new UnauthorizedException('You are not a member of this chat room');
      }

      const messages = await this.messageModel.aggregate<MessageResponse>([
        {
          $match: {
            room_id: new Types.ObjectId(roomId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            content: 1,
            created_at: 1,
            updated_at: 1,
            user: {
              id: '$user._id',
              name: '$user.name',
              avatar: '$user.avatar'
            }
          }
        },
        {
          $sort: {
            created_at: -1
          }
        },
        {
          $skip: Math.max(0, Number(offset) || 0)
        },
        {
          $limit: Math.max(0, Number(limit) || 50)
        }
      ]);

      return { messages };
    } catch {
      throw new InternalServerErrorException('Could not fetch room messages');
    }
  }

  async getRoomLatestMessage(roomId: string, user: JwtPayload): Promise<MessageResponse | null> {
    try {

      // check if room is single
      const room = await this.messageRoomModel.findById(roomId);

      // Check if user is a member of the room
      const roomMember = await this.messageRoomUserModel.findOne({
        room_id: new Types.ObjectId(roomId),
        user_id: new Types.ObjectId(user.user_id)
      });

      if (room?.type === 'single' && !roomMember) {
        throw new UnauthorizedException('You are not a member of this chat room');
      }

      const messages = await this.messageModel.aggregate<MessageResponse>([
        {
          $match: {
            room_id: new Types.ObjectId(roomId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            content: 1,
            created_at: 1,
            updated_at: 1,
            user: {
              id: '$user._id',
              name: '$user.name',
              avatar: '$user.avatar'
            }
          }
        },
        {
          $sort: {
            created_at: -1
          }
        },
        {
          $limit: 1
        }
      ]);

      return messages[0] || null;
    } catch {
      throw new InternalServerErrorException('Could not fetch latest message');
    }
  }

  async getRoomMessageIds(roomId: string, user: JwtPayload): Promise<{ id: string }[]> {
    try {
      // Check if user is a member of the room

      // check if room is single
      const room = await this.messageRoomModel.findById(roomId);

      const roomMember = await this.messageRoomUserModel.findOne({
        room_id: new Types.ObjectId(roomId),
        user_id: new Types.ObjectId(user.user_id)
      });

      if (room?.type === 'single' && !roomMember) {
        throw new UnauthorizedException('You are not a member of this chat room');
      }

      const messages = await this.messageModel.aggregate<{ id: string }>([
        {
          $match: {
            room_id: new Types.ObjectId(roomId)
          }
        },
        {
          $project: {
            _id: 0,
            id: '$_id'
          }
        },
        {
          $sort: {
            created_at: -1
          }
        },
        {
          $limit: 10000
        }
      ]);

      return messages;
    } catch {
      throw new InternalServerErrorException('Could not fetch message IDs');
    }
  }

  async deleteFile(deleteFileDto: DeleteFileDto, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      // check if user owns the message
      const message = await this.messageModel.findById(deleteFileDto.message_id);
      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.user_id.toString() !== user.user_id) {
        throw new UnauthorizedException('You can only delete your own messages');
      }

      // check if message has file
      if (!deleteFileDto.files || deleteFileDto.files.length === 0) {
        throw new BadRequestException('Message has no file');
      }

      // delete file
      await this.fileService.deleteFile(deleteFileDto.files[0]);

      return { status: 'success', message: 'File deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete file');
    }
  }
} 