import { IsString, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsString()
  class_id: string;

  @IsString()
  room_id: string;

  @IsObject()
  message: Record<string, any>;
} 