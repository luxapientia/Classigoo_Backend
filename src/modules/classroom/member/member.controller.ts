import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { UserGuard } from '../../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { InviteMemberDto, InviteMemberResponse } from './dto/invite-member.dto';
import { RemoveMemberDto, RemoveMemberResponse } from './dto/remove-member.dto';
import { ChangeRoleDto, ChangeRoleResponse } from './dto/change-role.dto';

@Controller('v1/classroom/member')
@UseGuards(UserGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('invite')
  async inviteMember(
    @Body() inviteMemberDto: InviteMemberDto,
    @CurrentUser() user: JwtPayload
  ): Promise<InviteMemberResponse> {
    return this.memberService.inviteMember(inviteMemberDto, user);
  }

  @Post('remove')
  async removeMember(
    @Body() removeMemberDto: RemoveMemberDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RemoveMemberResponse> {
    return this.memberService.removeMember(removeMemberDto, user);
  }

  @Post('change-role')
  async changeRole(
    @Body() changeRoleDto: ChangeRoleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ChangeRoleResponse> {
    return this.memberService.changeRole(changeRoleDto, user);
  }
} 