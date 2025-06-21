import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadResponse {
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class FileService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(FileService.name);
  private readonly bucketName: string;
  private readonly cloudfrontDomain: string;
  private readonly cloudfrontKeyPairId: string;
  private readonly cloudfrontPrivateKey: string;
  private readonly signedUrlExpiry: number;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('env.aws.region') ?? '',
      credentials: {
        accessKeyId: this.configService.get<string>('env.aws.accessKeyId') ?? '',
        secretAccessKey: this.configService.get<string>('env.aws.secretAccessKey') ?? '',
      },
    });

    this.bucketName = this.configService.get<string>('env.aws.s3.bucketName') ?? '';
    this.cloudfrontDomain = this.configService.get<string>('env.aws.cloudfront.domain') ?? '';
    this.cloudfrontKeyPairId = this.configService.get<string>('env.aws.cloudfront.keyPairId') ?? '';
    this.cloudfrontPrivateKey = this.configService.get<string>('env.aws.cloudfront.privateKey') ?? '';
    this.signedUrlExpiry = this.configService.get<number>('env.aws.cloudfront.signedUrlExpiry', 86400); // 24 hours default
    console.log(this. signedUrlExpiry)
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string
  ): Promise<FileUploadResponse> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const key = `${folder}/${uuidv4()}.${fileExtension}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalname: file.originalname,
          },
        })
      );

      return {
        key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new Error('Failed to upload file');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new Error('Failed to delete file');
    }
  }

  getSignedUrl(key: string): string {
    try {
      const url = `https://${this.cloudfrontDomain}/${key}`;
      
      return getSignedUrl({
        url,
        keyPairId: this.cloudfrontKeyPairId,
        privateKey: this.cloudfrontPrivateKey,
        dateLessThan: new Date(Date.now() + (this.signedUrlExpiry * 1000)).toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw new Error('Failed to generate signed URL');
    }
  }
}