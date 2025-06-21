import { IsArray, IsString } from 'class-validator';

export class DeleteFileDto {
  @IsArray()
  files: string[]

  @IsString()
  exam_submission_id: string
} 