import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateClassroomPostDto {
  @IsArray()
  @IsNotEmpty()
  audience: string[];

  @IsString()
  @IsNotEmpty()
  classroom_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsNotEmpty()
  files: any[];

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  published_at?: string;
} 