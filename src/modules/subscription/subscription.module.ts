import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../../shared/shared.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ChildParent, ChildParentSchema } from './schemas/child-parent.schema';
import { Notification, NotificationSchema } from '../classroom/member/schemas/notification.schema';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ChildParent.name, schema: ChildParentSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    ConfigModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {} 