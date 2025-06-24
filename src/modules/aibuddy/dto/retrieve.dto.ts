import { IsString } from 'class-validator';

export class RetrieveDto {
  @IsString()
  chat_id: string;

  @IsString()
  model: string;
}

export class RetrieveResponseDto {
  status: string;
  message: string;
  limit: number;
  chats: any[];
  not_found: boolean;
} 