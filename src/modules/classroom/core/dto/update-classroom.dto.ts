import { IsString, IsBoolean } from 'class-validator';

export class UpdateClassroomDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  section: string;

  @IsString()
  room: string;

  @IsBoolean()
  child_only: boolean;
} 