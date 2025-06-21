import { IsString, IsOptional } from 'class-validator';

export class UpdateAddressDto {
  @IsString()
  address1: string;

  @IsString()
  @IsOptional()
  address2?: string;

  @IsString()
  city: string;

  @IsString()
  zip: string;

  @IsString()
  country: string;
} 