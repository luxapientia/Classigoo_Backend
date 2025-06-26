import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Schedule } from './schemas/schedule.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { PubSubService } from '../../../shared/services/pubsub.service';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Schedule.name) private scheduleModel: Model<Schedule>,
    @InjectModel(Classroom.name) private classroomModel: Model<Classroom>,
    @InjectModel(ClassroomAccess.name) private classroomAccessModel: Model<ClassroomAccess>,
    private readonly pubSubService: PubSubService
  ) {}

  private async checkTeacherAccess(classId: string, userId: string): Promise<void> {
    const access = await this.classroomAccessModel.findOne({
      class_id: new Types.ObjectId(classId),
      user_id: new Types.ObjectId(userId),
      status: 'accepted',
      role: { $in: ['teacher', 'owner'] }
    });

    if (!access) {
      throw new UnauthorizedException('Only teachers and owners can modify schedules');
    }
  }

  private async checkClassAccess(classId: string, userId: string): Promise<void> {
    const access = await this.classroomAccessModel.findOne({
      class_id: new Types.ObjectId(classId),
      user_id: new Types.ObjectId(userId),
      status: 'accepted'
    });

    if (!access) {
      throw new UnauthorizedException('You do not have access to this classroom');
    }
  }

  async getClassroomSchedules(classId: string, user: JwtPayload) {
    try {
      await this.checkClassAccess(classId, user.user_id);

      const schedules = await this.scheduleModel.aggregate([
        {
          $match: {
            class_id: new Types.ObjectId(classId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'owner_id',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $unwind: '$owner'
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            title: 1,
            description: 1,
            start_time: 1,
            end_time: 1,
            created_at: 1,
            updated_at: 1,
            owner: {
              id: '$owner._id',
              name: '$owner.name',
              email: '$owner.email',
              avatar: '$owner.avatar'
            }
          }
        },
        {
          $sort: {
            start_time: -1
          }
        }
      ]);

      return {
        status: 'success',
        message: 'Schedules retrieved successfully',
        data: schedules
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get schedules');
    }
  }

  async createSchedule(createScheduleDto: CreateScheduleDto, user: JwtPayload) {
    try {
      await this.checkTeacherAccess(createScheduleDto.class_id, user.user_id);

      const schedule = new this.scheduleModel({
        ...createScheduleDto,
        owner_id: new Types.ObjectId(user.user_id),
        class_id: new Types.ObjectId(createScheduleDto.class_id)
      });

      const savedSchedule = await schedule.save();

      // Publish event
      await this.pubSubService.publish('schedule.updated', {
        cid: createScheduleDto.class_id
      });

      return {
        status: 'success',
        message: 'Schedule created successfully',
        data: {
          id: savedSchedule._id?.toString()
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create schedule');
    }
  }

  async updateSchedule(updateScheduleDto: UpdateScheduleDto, user: JwtPayload) {
    try {
      const schedule = await this.scheduleModel.findById(updateScheduleDto.id);
      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      await this.checkTeacherAccess(schedule.class_id.toString(), user.user_id);

      const updatedSchedule = await this.scheduleModel.findByIdAndUpdate(
        updateScheduleDto.id,
        {
          title: updateScheduleDto.title,
          description: updateScheduleDto.description,
          start_time: updateScheduleDto.start_time,
          end_time: updateScheduleDto.end_time
        },
        { new: true }
      );

      // Publish event
      await this.pubSubService.publish('schedule.updated', {
        cid: schedule.class_id.toString()
      });

      return {
        status: 'success',
        message: 'Schedule updated successfully',
        data: {
          id: updatedSchedule?._id?.toString()
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update schedule');
    }
  }

  async deleteSchedule(id: string, user: JwtPayload) {
    try {
      const schedule = await this.scheduleModel.findById(id);
      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      await this.checkTeacherAccess(schedule.class_id.toString(), user.user_id);

      await this.scheduleModel.findByIdAndDelete(id);

      // Publish event
      await this.pubSubService.publish('schedule.updated', {
        cid: schedule.class_id.toString()
      });

      return {
        status: 'success',
        message: 'Schedule deleted successfully',
        data: {
          id: schedule._id?.toString()
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete schedule');
    }
  }
} 