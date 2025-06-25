import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Classroom } from './schemas/classroom.schema';
import { ClassroomAccess } from './schemas/classroom-access.schema';
import { MessageRoom } from '../message/schemas/message-room.schema';
import { Message } from '../message/schemas/message.schema';
import { ClassroomPost } from '../post/schemas/classroom-post.schema';
import { Exam } from '../exam/schemas/exam.schema';
import { Assignment } from '../assignment/schemas/assignment.schema';
import { CreateClassroomDto, CreateClassroomResponse } from './dto/create-classroom.dto';
import { JoinClassroomDto, JoinClassroomResponse } from './dto/join-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { ToggleInvitationDto } from './dto/toggle-invitation.dto';
import * as randomstring from 'randomstring';

@Injectable()
export class CoreService {
  constructor(
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(MessageRoom.name) private messageRoomModel: Model<MessageRoom>,
    @InjectModel(ClassroomPost.name) private classroomPostModel: Model<ClassroomPost>,
    @InjectModel(Exam.name) private examModel: Model<Exam>,
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
    private pubSubService: PubSubService,
    private configService: ConfigService,
  ) {}

  async createClassroom(
    createClassroomDto: CreateClassroomDto,
    user: JwtPayload
  ): Promise<CreateClassroomResponse> {
    try {
      // Generate invitation code
      const invitationCode = randomstring.generate({
        length: 7,
        charset: 'alphanumeric'
      });

      // Generate random cover image number (1-10)
      const randomInt = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
      const coverImg = `${this.configService.get('env.aws.s3.staticCdnUrl')}/content/cover/${randomInt}.jpeg`;

      // Create classroom
      const createdClassroom = await this.classroomModel.create({
        ...createClassroomDto,
        owner: new Types.ObjectId(user.user_id),
        invitation_code: invitationCode,
        cover_img: coverImg
      }) as Classroom & { _id: Types.ObjectId };

      // Create classroom access for owner
      await this.classroomAccessModel.create({
        class_id: createdClassroom._id,
        user_id: new Types.ObjectId(user.user_id),
        role: 'owner',
        status: 'accepted'
      });

      // Create group chat room
      const groupChat = await this.messageRoomModel.create({
        name: 'Classroom Group',
        type: 'all',
        classroom_id: createdClassroom._id,
        active_at: new Date()
      });

      // Add initial system message
      await this.messageModel.create({
        room_id: groupChat._id,
        user_id: new Types.ObjectId(user.user_id),
        content: { type: 'system', text: 'Group Created' }
      });

      await this.pubSubService.publish('classroom.updated', {
        id: createdClassroom._id.toString(),
        data: createdClassroom
      });

      return {
        id: createdClassroom._id.toString(),
        message: 'Classroom created successfully',
        status: 'success'
      };
    } catch (error) {
      console.error('Create Classroom Error:', error);
      throw new InternalServerErrorException('Could not create classroom');
    }
  }

  async join(joinClassroomDto: JoinClassroomDto, user: JwtPayload): Promise<JoinClassroomResponse> {
    try {
      // Find classroom by invitation code
      const targetClassroom = await this.classroomModel.findById(joinClassroomDto.class_id);

      if (!targetClassroom) {
        throw new NotFoundException('Classroom not found with provided invitation code');
      }

      // Check if user already has access
      const existingAccess = await this.classroomAccessModel.findOne({
        class_id: targetClassroom._id,
        user_id: new Types.ObjectId(user.user_id),
      });

      if (existingAccess) {
        if (existingAccess.status === 'accepted') {
          return {
            id: joinClassroomDto.class_id,
            message: 'You are already a member of this classroom',
            status: 'error'
          };
        } else if (existingAccess.status === 'pending') {
          // Update pending access to accepted
          await this.classroomAccessModel.findByIdAndUpdate(
            existingAccess._id,
            { status: 'accepted' }
          );
        }
      } else {
        // Create new access
        await this.classroomAccessModel.create({
          class_id: new Types.ObjectId(joinClassroomDto.class_id),
          user_id: new Types.ObjectId(user.user_id),
          role: 'student',
          status: 'accepted'
        });
      }

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: joinClassroomDto.class_id,
      })

      await this.pubSubService.publish('classroom.member.updated', {
        id: joinClassroomDto.class_id,
        data: {
          user_id: user.user_id,
          role: 'student',
        }
      })

      return {
        id: joinClassroomDto.class_id,
        message: 'Successfully joined classroom',
        status: 'success'
      };
    } catch (error) {
      console.error('Join Classroom Error:', error);
      throw new InternalServerErrorException('Could not join classroom');
    }
  }

  async updateClassroom(updateClassroomDto: UpdateClassroomDto, user: JwtPayload): Promise<Classroom> {
    try {
      const classroom = await this.classroomModel.findById(updateClassroomDto.id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has permission to update this classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(updateClassroomDto.id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to update this classroom');
      }

      const { id, ...updateData } = updateClassroomDto;
      const updatedClassroom = await this.classroomModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate('owner');
      
      if (!updatedClassroom) {
        throw new InternalServerErrorException('Failed to update classroom');
      }

      await this.pubSubService.publish('classroom.updated', {
        id: updatedClassroom?._id?.toString(),
        classroom: updatedClassroom
      });
      
      return updatedClassroom;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update classroom');
    }
  }

  async getAllClassrooms(user: JwtPayload): Promise<any> {
    try {
      const result = await this.classroomAccessModel.aggregate([
        {
          $match: {
            user_id: new Types.ObjectId(user.user_id),
            status: 'accepted'
          }
        },
        {
          $lookup: {
            from: 'classrooms',
            localField: 'class_id',
            foreignField: '_id',
            as: 'classroom'
          }
        },
        {
          $unwind: '$classroom'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'classroom.owner',
            foreignField: '_id',
            as: 'ownerDetails'
          }
        },
        {
          $unwind: '$ownerDetails'
        },
        {
          $project: {
            _id: '$classroom._id',
            name: '$classroom.name',
            owner: '$classroom.owner',
            room: '$classroom.room',
            section: '$classroom.section',
            subject: '$classroom.subject',
            invitation_code: '$classroom.invitation_code',
            cover_img: '$classroom.cover_img',
            ownerDetails: {
              avatar: '$ownerDetails.avatar',
              name: '$ownerDetails.name'
            }
          }
        }
      ]);

      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not fetch classrooms');
    }
  }

  async getClassroom(id: string, user: JwtPayload): Promise<any> {
    try {
      // Check if user has permission to view this classroom
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted'
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this classroom');
      }

      // const classroom = await this.classroomModel.findById(id).populate('owner');

      const result = await this.classroomModel.aggregate([
        {
          $match: { _id: new Types.ObjectId(id) }
        },
        {
          $lookup: {
            from: 'users', // collection name, NOT model name
            localField: 'owner',
            foreignField: '_id',
            as: 'ownerDetails'
          }
        },
        {
          $unwind: {
            path: '$ownerDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'classroom_access', // collection name (plural & lowercase)
            localField: '_id',
            foreignField: 'class_id',
            as: 'classroom_relation'
          }
        },
        {
          $unwind: {
            path: '$classroom_relation',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'classroom_relation.user_id',
            foreignField: '_id',
            as: 'classroom_relation.user'
          }
        },
        {
          $unwind: {
            path: '$classroom_relation.user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            section: { $first: '$section' },
            subject: { $first: '$subject' },
            room: { $first: '$room' },
            child_only: { $first: '$child_only' },
            invitation_code: { $first: '$invitation_code' },
            cover_img: { $first: '$cover_img' },
            created_at: { $first: '$created_at' },
            updated_at: { $first: '$updated_at' },
            ownerDetails: { $first: '$ownerDetails' },
            classroom_relation: {
              $push: '$classroom_relation'
            }
          }
        }
      ]);
      
      
      if (!result) {
        throw new NotFoundException('Classroom not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get classroom');
    }
  }

  async deleteClassroom(id: string, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      const classroom = await this.classroomModel.findById(id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is the owner
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: 'owner'
      });

      if (!access) {
        throw new UnauthorizedException('Only the classroom owner can delete the classroom');
      }

      // Delete all related data
      await Promise.all([
        this.classroomAccessModel.deleteMany({ class_id: new Types.ObjectId(id) }),
        this.classroomPostModel.deleteMany({ classroom_id: new Types.ObjectId(id) }),
        this.messageRoomModel.deleteMany({ classroom_id: new Types.ObjectId(id) }),
        this.examModel.deleteMany({ class_id: new Types.ObjectId(id) }),
        this.assignmentModel.deleteMany({ class_id: new Types.ObjectId(id) })
      ]);

      // Delete the classroom
      const result = await this.classroomModel.findByIdAndDelete(id);
      if (!result) {
        throw new InternalServerErrorException('Failed to delete classroom');
      }

      await this.pubSubService.publish('classroom.updated', {
        id: id,
        data: result
      });

      return {
        status: 'success',
        message: 'Classroom deleted successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete classroom');
    }
  }

  async enableInvitation(input: ToggleInvitationDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      const classroom = await this.classroomModel.findById(input.classroom_id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has permission
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(input.classroom_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to manage invitations');
      }

      // Generate new invitation code
      const code = randomstring.generate(7);

      // Update classroom with new code
      await this.classroomModel.findByIdAndUpdate(input.classroom_id, {
        invitation_code: code
      });

      // publish event
      await this.pubSubService.publish('classroom.updated', {
        id: input.classroom_id,
        data: {
          invitation_code: code
        }
      });

      return {
        status: 'success',
        message: 'Invitation enabled'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not enable invitation');
    }
  }

  async disableInvitation(input: ToggleInvitationDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      const classroom = await this.classroomModel.findById(input.classroom_id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has permission
      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(input.classroom_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to manage invitations');
      }

      // Disable invitation code and remove pending access requests
      await Promise.all([
        this.classroomModel.findByIdAndUpdate(input.classroom_id, {
          invitation_code: ''
        }),
        this.classroomAccessModel.deleteMany({
          class_id: new Types.ObjectId(input.classroom_id),
          status: 'pending'
        })
      ]);

      // publish event
      await this.pubSubService.publish('classroom.updated', {
        id: input.classroom_id
      });

      return {
        status: 'success',
        message: 'Invitation disabled'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not disable invitation');
    }
  }

  async getClassroomAccess(input: { cid: string; uid: string }, user: JwtPayload): Promise<{ status: string; data: any }> {
    try {
      // Verify the user has permission to view this access info
      if (user.user_id !== input.uid) {
        throw new UnauthorizedException('You can only view your own access information');
      }

      const access = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(input.cid),
        user_id: new Types.ObjectId(input.uid)
      });

      return {
        data: access,
        status: 'success'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get classroom access information');
    }
  }

  async getClassroomNames(uid: string, user: JwtPayload): Promise<any> {
    try {
      if (user.user_id !== uid) {
        throw new UnauthorizedException('You can only view your own classroom names');
      }

      const results = await this.classroomAccessModel.aggregate([
        {
          $match: {
            user_id: new Types.ObjectId(uid),
            status: 'accepted',
            role: { $in: ['owner', 'teacher'] }
          }
        },
        {
          $lookup: {
            from: 'classrooms',
            localField: 'class_id',
            foreignField: '_id',
            as: 'classroom'
          }
        },
        {
          $unwind: '$classroom'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            classroom: {
              id: '$classroom._id',
              name: '$classroom.name'
            }
          }
        }
      ]);

      return {
        status: 'success',
        message: 'Classroom names retrieved successfully',
        data: results
      }
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get classroom names');
    }
  }
} 