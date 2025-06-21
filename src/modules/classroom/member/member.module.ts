import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedModule } from '../../../shared/shared.module';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { Classroom, ClassroomSchema } from '../core/schemas/classroom.schema';
import { ClassroomAccess, ClassroomAccessSchema } from '../core/schemas/classroom-access.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { MailService } from '../../../common/utils/mail.service';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: Classroom.name, schema: ClassroomSchema },
      { name: ClassroomAccess.name, schema: ClassroomAccessSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [MemberController],
  providers: [MemberService, MailService],
  exports: [MemberService],
})
export class MemberModule {} 