import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { User } from '../../../modules/auth/schemas/user.schema';
import { Notification } from './schemas/notification.schema';
import { InviteMemberDto, InviteMemberResponse } from './dto/invite-member.dto';
import { RemoveMemberDto, RemoveMemberResponse } from './dto/remove-member.dto';
import { ChangeRoleDto, ChangeRoleResponse } from './dto/change-role.dto';
import { MailService } from '../../../common/utils/mail.service';

@Injectable()
export class MemberService {
  constructor(
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    private readonly mailService: MailService,
    private readonly pubSubService: PubSubService,
  ) {}

  async inviteMember(inviteMemberDto: InviteMemberDto, user: JwtPayload): Promise<InviteMemberResponse> {
    try {
      const { class_id, email, role } = inviteMemberDto;

      // Check if classroom exists
      const classroom = await this.classroomModel.findById(class_id);
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(class_id),
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to invite members');
      }

      // Get current user details
      const currentUserData = await this.userModel.findById(user.user_id);
      if (!currentUserData) {
        throw new BadRequestException('Current user not found');
      }

      // Find user by email
      const invitedUser = await this.userModel.findOne({ email });
      if (!invitedUser) {
        throw new BadRequestException('The user does not exist');
      }

      // Check if user is already a member
      const existingAccess = await this.classroomAccessModel.findOne({
        class_id: new Types.ObjectId(class_id),
        user_id: invitedUser._id
      });

      if (existingAccess) {
        throw new BadRequestException('User is already a member of the classroom');
      }

      // Create access
      const classroomAccess = await this.classroomAccessModel.create({
        class_id: new Types.ObjectId(class_id),
        user_id: invitedUser._id,
        role,
        status: 'pending'
      });

      if (!classroomAccess) {
        throw new InternalServerErrorException('Failed to invite user');
      }

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: class_id,
      })

      // Create notification
      await this.notificationModel.create({
        user_id: invitedUser._id,
        image: process.env.NOTIFICATION_JOIN_CLASSROOM_IMAGE_URL,
        content: `${currentUserData.name} invited you to join a classroom`,
        link: `/classrooms?action=join&code=${class_id}`,
        is_read: false
      });

      // Send invitation email
      await this.mailService.sendMail({
        to: invitedUser.email,
        subject: 'You have been invited to join a classroom',
        text: `You have been invited to join a classroom by ${currentUserData.name}.\n\n` +
              `Click here to accept: ${process.env.FRONTEND_URL}/classroom/${class_id}/join?code=${classroom.invitation_code}\n\n` +
              `Click here to decline: ${process.env.FRONTEND_URL}/classroom/${class_id}/leave`
      });

      return {
        status: 'success',
        message: 'Successfully invited member'
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not invite member');
    }
  }

  async removeMember(removeMemberDto: RemoveMemberDto, user: JwtPayload): Promise<RemoveMemberResponse> {
    try {
      const { relation_id } = removeMemberDto;

      // Get access details
      const access = await this.classroomAccessModel.findById(relation_id);
      if (!access) {
        throw new NotFoundException('Relation not found');
      }

      // Check if trying to remove owner
      if (access.role === 'owner') {
        throw new BadRequestException('The owner cannot be removed');
      }

      // If self-removal
      if (access.user_id.toString() === user.user_id) {
        await this.classroomAccessModel.findByIdAndDelete(relation_id);
        return {
          status: 'success',
          message: 'Successfully left classroom'
        };
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessModel.findOne({
        class_id: access.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to remove members');
      }

      // Remove member
      await this.classroomAccessModel.findByIdAndDelete(relation_id);

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: access.class_id.toString(),
      })

      await this.pubSubService.publish('classroom.member.updated', {
        id: access.class_id.toString(),
        data: {
          user_id: access.user_id.toString(),
          role: access.role,
        }
      })

      return {
        status: 'success',
        message: 'Successfully removed member'
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not remove member');
    }
  }

  async changeRole(changeRoleDto: ChangeRoleDto, user: JwtPayload): Promise<ChangeRoleResponse> {
    try {
      const { id: accessId, role } = changeRoleDto;

      // Get access details
      const access = await this.classroomAccessModel.findById(accessId);
      if (!access) {
        throw new NotFoundException('Requested access not found');
      }

      // Check if user is trying to change their own role
      if (access.user_id.toString() === user.user_id) {
        throw new BadRequestException('You are not allowed to change your own role');
      }

      // Check if current user has permission
      const currentUserAccess = await this.classroomAccessModel.findOne({
        class_id: access.class_id,
        user_id: new Types.ObjectId(user.user_id),
        status: 'accepted',
        role: { $in: ['owner', 'teacher'] }
      });

      if (!currentUserAccess) {
        throw new BadRequestException('You do not have permission to change role');
      }

      // Update role
      await this.classroomAccessModel.findByIdAndUpdate(accessId, { role });

      // Publish event
      await this.pubSubService.publish('classroom.updated', {
        id: access.class_id.toString(),
      })

      await this.pubSubService.publish('classroom.member.updated', {
        id: access.class_id.toString(),
        data: {
          user_id: access.user_id.toString(),
          role: access.role,
        }
      })

      return {
        status: 'success',
        message: 'Role changed successfully'
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not change role');
    }
  }
} 