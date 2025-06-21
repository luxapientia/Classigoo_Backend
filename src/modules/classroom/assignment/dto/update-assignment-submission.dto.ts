import { IsNotEmpty, IsString, IsArray, IsEnum } from 'class-validator';

export class UpdateAssignmentSubmissionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsArray()
  @IsNotEmpty()
  files: any[];

  @IsString()
  @IsNotEmpty()
  @IsEnum(['draft', 'published'])
  status: string;
} 