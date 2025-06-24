import { IsString } from 'class-validator';

export class SearchDto {
  @IsString()
  model: string;

  @IsString()
  query: string;
}

export class SearchResponseDto {
  status: string;
  message: string;
  data: any[];
} 