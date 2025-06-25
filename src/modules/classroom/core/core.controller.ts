import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CoreService } from './core.service';
import { CreateClassroomDto, CreateClassroomResponse } from './dto/create-classroom.dto';
import { JoinClassroomDto, JoinClassroomResponse } from './dto/join-classroom.dto';
import { UserGuard } from '../../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { ToggleInvitationDto } from './dto/toggle-invitation.dto';

@Controller('v1/classroom')
@UseGuards(UserGuard)
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Post('create')
  async createClassroom(
    @Body() createClassroomDto: CreateClassroomDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CreateClassroomResponse> {
    return this.coreService.createClassroom(createClassroomDto, user);
  }

  @Post('join')
  async joinClassroom(
    @Body() joinClassroomDto: JoinClassroomDto,
    @CurrentUser() user: JwtPayload
  ): Promise<JoinClassroomResponse> {
    return this.coreService.join(joinClassroomDto, user);
  }

  @Put('update')
  async updateClassroom(
    @Body() updateClassroomDto: UpdateClassroomDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.coreService.updateClassroom(updateClassroomDto, user);
  }

  @Get('all')
  async getAllClassrooms(
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.coreService.getAllClassrooms(user);
  }

  @Get(':id')
  async getClassroom(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.coreService.getClassroom(id, user);
  }

  @Delete(':id')
  async deleteClassroom(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.coreService.deleteClassroom(id, user);
  }

  @Post('invitation/enable')
  async enableInvitation(
    @Body() toggleInvitationDto: ToggleInvitationDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.coreService.enableInvitation(toggleInvitationDto, user);
  }

  @Post('invitation/disable')
  async disableInvitation(
    @Body() toggleInvitationDto: ToggleInvitationDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.coreService.disableInvitation(toggleInvitationDto, user);
  }

  @Get('access/:cid/:uid')
  async getClassroomAccess(
    @Param('cid') cid: string,
    @Param('uid') uid: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.coreService.getClassroomAccess({ cid, uid }, user);
  }

  // get classroom names
  @Get('names/:uid')
  async getClassroomNames(
    @Param('uid') uid: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.coreService.getClassroomNames(uid, user);
  }
} 