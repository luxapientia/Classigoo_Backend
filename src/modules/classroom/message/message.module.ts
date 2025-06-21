import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessageRoom, MessageRoomSchema } from './schemas/message-room.schema';
import { MessageRoomUser, MessageRoomUserSchema } from './schemas/message-room-user.schema';
import { Classroom, ClassroomSchema } from '../core/schemas/classroom.schema';
import { ClassroomAccess, ClassroomAccessSchema } from '../core/schemas/classroom-access.schema';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: MessageRoom.name, schema: MessageRoomSchema },
      { name: MessageRoomUser.name, schema: MessageRoomUserSchema },
      { name: Classroom.name, schema: ClassroomSchema },
      { name: ClassroomAccess.name, schema: ClassroomAccessSchema },
    ]),
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {} 