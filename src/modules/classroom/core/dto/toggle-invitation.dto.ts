import { IsString } from 'class-validator';

export class ToggleInvitationDto {
  @IsString()
  classroom_id: string;
} 