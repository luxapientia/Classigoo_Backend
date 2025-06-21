import { IsNotEmpty, IsString, IsArray, IsEnum } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  class_id: string;

  @IsArray()
  @IsNotEmpty()
  audience: string[];

  @IsArray()
  @IsNotEmpty()
  files: any[];

  @IsString()
  @IsNotEmpty()
  deadline: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['draft', 'published'])
  status: string;
} 