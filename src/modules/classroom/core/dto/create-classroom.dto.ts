import { IsString, IsOptional } from 'class-validator';
import { ApiResponse } from '../../common/interfaces/response.interface';

export class CreateClassroomDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  room?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  subject?: string;
}

export type CreateClassroomResponse = ApiResponse; 