import { IsNotEmpty, IsString, IsArray, IsEnum } from 'class-validator';

export class UpdateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsNotEmpty()
  audience: string[];

  @IsArray()
  @IsNotEmpty()
  files: any[];

  @IsString()
  @IsNotEmpty()
  deadline: Date;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['draft', 'published'])
  status: string;
} 