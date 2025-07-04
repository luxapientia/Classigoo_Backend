import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AccountModule } from './modules/account/account.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { AIBuddyModule } from './modules/aibuddy/aibuddy.module';
import { NoteModule } from './modules/note/note.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('database.uri') ??
          'mongodb://localhost:27017/classigoo',
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    ClassroomModule,
    AccountModule,
    AIBuddyModule,
    NoteModule,
    SubscriptionModule,
  ],
})
export class AppModule {}
