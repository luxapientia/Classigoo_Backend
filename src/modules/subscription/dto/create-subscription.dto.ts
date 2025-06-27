import { IsString, IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  id: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  plan: string;
} 