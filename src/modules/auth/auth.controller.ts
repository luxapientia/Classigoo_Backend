import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto, ValidateOtpDto, ResendOtpDto } from './dto/auth.dto';
import { UserGuard } from '../../shared/guards/user.guard';
import { Request } from 'express';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  @UseGuards(UserGuard)
  status() {
    return {
      status: 'success',
      message: 'User is authenticated',
      i18n: 'user_authenticated',
    };
  }

  @Post('otp/send')
  async sendOtp(@Body() sendOtpDto: SendOtpDto, @Req() req: Request) {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await this.authService.sendOtp({
        ...sendOtpDto,
        ip,
      });
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to send OTP',
        i18n: 'otp_send_failed',
      });
    }
  }

  @Post('otp/validate')
  async validateOtp(
    @Body() validateOtpDto: ValidateOtpDto,
    @Req() req: Request
  ) {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await this.authService.validateOtp({
        ...validateOtpDto,
        ip,
      });
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to validate OTP',
        i18n: 'otp_validation_failed',
      });
    }
  }

  @Post('otp/resend')
  async resendOtp(@Body() resendOtpDto: ResendOtpDto, @Req() req: Request) {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await this.authService.resendOtp({
        ...resendOtpDto,
        ip,
      });
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to resend OTP',
        i18n: 'otp_resend_failed',
      });
    }
  }
}
