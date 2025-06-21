import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileService } from '../services/file.service';
import * as multer from 'multer';
import { Request, Response } from 'express';

// Extend Express types for our custom properties
interface RequestWithFiles extends Request {
  files?: Express.Multer.File[];
}

interface CustomRequest extends RequestWithFiles {
  processedFiles?: Array<{
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
    signedUrl: string;
  }>;
}

@Injectable()
export class FileInterceptor implements NestInterceptor {
  constructor(private readonly fileService: FileService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Set up multer with memory storage
    const storage = multer.memoryStorage();
    const uploadMiddleware = multer({ 
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Max 10 files
      }
    }).array('files', 10);

    // Process the multipart form data
    try {
      await new Promise<void>((resolve, reject) => {
        void uploadMiddleware(request as Request, response, (error: any) => {
          if (error instanceof multer.MulterError) {
            reject(new BadRequestException(`File upload error: ${error.message}`));
          } else if (error) {
            reject(new BadRequestException('Failed to process file upload'));
          }
          resolve();
        });
      });

      if (!request.files || request.files.length === 0) {
        return next.handle();
      }

      const processedFiles = await Promise.all(
        request.files.map(async (file) => {
          const uploadResult = await this.fileService.uploadFile(
            file,
            request.body?.fileFolder || 'general'
          );
          const signedUrl = this.fileService.getSignedUrl(uploadResult.key);
          
          return {
            ...uploadResult,
            signedUrl,
          };
        })
      );

      // Assign processed files to request object
      request.processedFiles = processedFiles;
      
      return next.handle();
    } catch (error) {
      console.error('File upload error:', error);
      throw error instanceof BadRequestException ? error : new BadRequestException('Failed to process files');
    }
  }
}