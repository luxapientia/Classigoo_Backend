import { IsNotEmpty, IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class UpdateExamDto {
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
  questions: any[];

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsOptional()
  @IsString()
  start_once?: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['draft', 'published'])
  status: string;
} 