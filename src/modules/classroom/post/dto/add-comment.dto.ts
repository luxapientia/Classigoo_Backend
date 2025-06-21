import { IsString, IsNotEmpty } from 'class-validator';

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  class_id: string;

  @IsString()
  @IsNotEmpty()
  post_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;
} 