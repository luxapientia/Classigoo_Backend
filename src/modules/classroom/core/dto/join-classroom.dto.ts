import { IsString } from 'class-validator';
import { ApiResponse } from '../../common/interfaces/response.interface';

export class JoinClassroomDto {
  @IsString()
  class_id: string;

  @IsString()
  join_code: string;
}

export type JoinClassroomResponse = ApiResponse; 