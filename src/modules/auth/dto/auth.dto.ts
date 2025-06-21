import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  ip: string;

  @IsBoolean()
  isSignup: boolean;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  os?: string;

  @IsString()
  @IsOptional()
  device?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  role: string;

  @IsBoolean()
  @IsOptional()
  remember_me?: boolean;

  @IsString()
  @IsOptional()
  push_token?: string;
}

export class ValidateOtpDto {
  @IsString()
  ip: string;

  @IsString()
  otp: string;

  @IsString()
  session_token: string;
}

export class ResendOtpDto {
  @IsString()
  session_token: string;

  @IsString()
  ip: string;
}
