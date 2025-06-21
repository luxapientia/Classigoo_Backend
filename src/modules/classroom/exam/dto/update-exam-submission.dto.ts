import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class UpdateExamSubmissionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsArray()
  answers: any[];

  @IsString()
  @IsNotEmpty()
  status: string;
} 