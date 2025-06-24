import { IsNumber, IsString } from 'class-validator';

export class HistoryDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsString()
  model: string;
}

export class HistoryResponseDto {
  status: string;
  message: string;
  history: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next_page: boolean;
  };
} 