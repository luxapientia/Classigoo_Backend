import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountModule } from './modules/account/account.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('database.uri') ??
          'mongodb://localhost:27017/classigoo_nest_rest',
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    ClassroomModule,
    AccountModule,
  ],
})
export class AppModule {}
