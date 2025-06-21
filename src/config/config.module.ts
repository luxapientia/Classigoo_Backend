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
      }),
    }),
  ],
})
export class ConfigModule {}
