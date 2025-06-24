import { IsString, IsOptional } from 'class-validator';

export class ChatDto {
  @IsString()
  model: string;

  @IsString()
  prompt: string;

  @IsString()
  @IsOptional()
  chat_id?: string;
}

export class ChatResponseDto {
  status: string;
  message: string;
  // limits: {
  //   request_count: number,
  //   total_request_limit: number,
  //   last_request_time: Date,
  //   last_reset_time: Date
  // };
  limits: number;
  content: string;
  chat_id: string;
} 