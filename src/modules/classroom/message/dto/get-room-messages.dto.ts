import { IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetRoomMessagesDto {
  @IsString()
  room_id: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  offset: number;
}

export class GetRoomLatestMessageDto {
  @IsString()
  room_id: string;
}

export interface MessageResponse {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  content: Record<string, any>;
  created_at: Date;
  updated_at: Date;
} 