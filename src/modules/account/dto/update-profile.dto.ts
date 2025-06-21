import { IsString, IsDateString, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  name: string;

  @IsString()
  bio: string;

  @IsDateString()
  birthday: string;

  // @IsObject()
  // avatar: {
  //   bucketKey: string;
  //   url: string;
  // };

  @IsString()
  institution: string;

  @IsString()
  phone: string;
} 