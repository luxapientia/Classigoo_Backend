import { IsNotEmpty, IsString, IsArray } from 'class-validator';

export class UpdateExamSubmissionMarkingsDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsArray()
  @IsNotEmpty()
  markings: any[];

  @IsString()
  @IsNotEmpty()
  status: string;
} 