import { IsNotEmpty, IsString } from 'class-validator';
import { ApiResponse } from '../../../../common/interfaces/response.interface';

export class RemoveMemberDto {
  @IsNotEmpty()
  @IsString()
  relation_id: string;
}

export type RemoveMemberResponse = ApiResponse; 