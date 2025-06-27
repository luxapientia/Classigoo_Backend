import { IsString } from 'class-validator';

export class ManageSubscriptionDto {
  @IsString()
  id: string;
} 