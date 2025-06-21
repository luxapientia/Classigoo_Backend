import { Request } from 'express';

export interface ApiResponse {
  id?: string;
  message: string;
  status: string;
} 

export interface ProcessedFile {
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  signedUrl: string;
}

export interface RequestWithFiles extends Request {
  processedFiles?: Array<ProcessedFile>;
}