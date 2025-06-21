import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserSchema } from './schemas/user.schema';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import {
  AuthNotification,
  AuthNotificationSchema,
} from './schemas/notification.schema';
import { Blacklist, BlacklistSchema } from './schemas/blacklist.schema';
import { SharedModule } from '../../shared/shared.module';
import { MailService } from '../../common/utils/mail.service';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Blacklist.name, schema: BlacklistSchema },
      { name: AuthNotification.name, schema: AuthNotificationSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService],
  exports: [AuthService],
})
export class AuthModule {}
