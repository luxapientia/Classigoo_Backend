import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class ChangeRoleDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsEnum(['student', 'teacher'])
  role: string;
}

export type ChangeRoleResponse = ApiResponse; 