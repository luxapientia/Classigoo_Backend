import { IsString } from 'class-validator';

export class StartChatDto {
  @IsString()
  classroom_id: string;

  @IsString()
  with_user: string;
} 