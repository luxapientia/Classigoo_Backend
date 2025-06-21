import { IsNotEmpty, IsString } from 'class-validator';

export class CreateExamSubmissionDto {
  @IsString()
  @IsNotEmpty()
  exam_id: string;

  @IsString()
  @IsNotEmpty()
  status: string;
} 