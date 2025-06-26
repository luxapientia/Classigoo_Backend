import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { UserGuard } from '../../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Controller('v1/classroom/schedule')
@UseGuards(UserGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('list/:classId')
  async getClassroomSchedules(
    @Param('classId') classId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.scheduleService.getClassroomSchedules(classId, user);
  }

  @Post('create')
  async createSchedule(
    @Body() createScheduleDto: CreateScheduleDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.scheduleService.createSchedule(createScheduleDto, user);
  }

  @Post('update')
  async updateSchedule(
    @Body() updateScheduleDto: UpdateScheduleDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.scheduleService.updateSchedule(updateScheduleDto, user);
  }

  @Delete(':id')
  async deleteSchedule(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.scheduleService.deleteSchedule(id, user);
  }
} 