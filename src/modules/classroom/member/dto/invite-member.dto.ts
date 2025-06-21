import { IsNotEmpty, IsString, IsEmail, IsEnum } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class InviteMemberDto {
  @IsNotEmpty()
  @IsString()
  class_id: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(['student', 'teacher'])
  role: string;
}

export type InviteMemberResponse = ApiResponse; 