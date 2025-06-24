import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import databaseConfig from './database/database.config';
import envConfig from './env/env.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, envConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(8000),
        MONGODB_URI: Joi.string().required(),
        JWT_PRIVATE_KEY: Joi.string().required(),
        JWT_PUBLIC_KEY: Joi.string().required(),
        MAILGUN_API_KEY: Joi.string().required(),
        MAILGUN_DOMAIN: Joi.string().required(),
        AWS_REGION: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_S3_BUCKET_NAME: Joi.string().required(),
        AWS_CLOUDFRONT_DOMAIN: Joi.string().required(),
        AWS_CLOUDFRONT_KEY_PAIR_ID: Joi.string().required(),
        AWS_CLOUDFRONT_PRIVATE_KEY: Joi.string().required(),
        AWS_CLOUDFRONT_SIGNED_URL_EXPIRY: Joi.number().required(),
        OPENAI_API_KEY: Joi.string().required(),
        OPENAI_ORG_ID: Joi.string().required(),
        OPENAI_MODEL: Joi.string().required(),
        OPENAI_TEMPERATURE: Joi.number().required(),
        OPENAI_TIMEOUT: Joi.number().required(),
        OPENAI_MAX_RETRIES: Joi.number().required(),
      }),
    }),
  ],
})
export class ConfigModule {}
