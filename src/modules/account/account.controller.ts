import { Body, Controller, Get, Param, Put, Post, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { AccountService } from './account.service';
import { UserGuard } from '../../shared/guards/user.guard';
import { FileInterceptor } from '../../shared/interceptors/file.interceptor';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { RequestWithFiles } from '../classroom/common/interfaces/response.interface';

@Controller('v1/account')
@UseGuards(UserGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  async getMyAccount(
    @CurrentUser() user: JwtPayload
  ) {
    try {
      const profile = await this.accountService.getProfile(user.user_id, user);
      return { status: 'success', data: profile };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  @Get('profile/:id')
  async getProfile(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    try {
      const profile = await this.accountService.getProfile(id, user);
      return { status: 'success', data: profile };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  @Post('profile/upload')
  @UseInterceptors(FileInterceptor)
  async uploadAvatar(
    @Req() request: RequestWithFiles,
    @CurrentUser() user: JwtPayload
  ) {
    try {
      const success = await this.accountService.uploadAvatar(request.processedFiles || [], user);
      return {
        status: success ? 'success' : 'error',
        message: success ? 'Avatar uploaded successfully' : 'Failed to upload avatar',
        avatar: {
          bucketKey: request.processedFiles?.at(0)?.key,
          url: request.processedFiles?.at(0)?.signedUrl
        }
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  @Put('profile/:id')
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload
  ) {
    try {
      const success = await this.accountService.updateProfile(id, updateProfileDto, user);
      return {
        status: success ? 'success' : 'error',
        message: success ? 'Profile updated successfully' : 'Failed to update profile',
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  @Put('address/:id')
  async updateAddress(
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @CurrentUser() user: JwtPayload
  ) {
    try {
      const success = await this.accountService.updateAddress(id, updateAddressDto, user);
      return {
        status: success ? 'success' : 'error',
        message: success ? 'Address updated successfully' : 'Failed to update address',
      };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
} 