import { IsNotEmpty, IsString, IsArray, IsEnum } from 'class-validator';

export class CreateAssignmentSubmissionDto {
  @IsString()
  @IsNotEmpty()
  assignment_id: string;

  @IsArray()
  @IsNotEmpty()
  files: any[];

  @IsString()
  @IsNotEmpty()
  @IsEnum(['draft', 'published'])
  status: string;
} 