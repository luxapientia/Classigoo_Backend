import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { Classroom, ClassroomSchema } from './schemas/classroom.schema';
import { ClassroomAccess, ClassroomAccessSchema } from './schemas/classroom-access.schema';
import { MessageRoom, MessageRoomSchema } from '../message/schemas/message-room.schema';
import { Message, MessageSchema } from '../message/schemas/message.schema';
import { ClassroomPost, ClassroomPostSchema } from '../post/schemas/classroom-post.schema';
import { Exam, ExamSchema } from '../exam/schemas/exam.schema';
import { Assignment, AssignmentSchema } from '../assignment/schemas/assignment.schema';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: Classroom.name, schema: ClassroomSchema },
      { name: ClassroomAccess.name, schema: ClassroomAccessSchema },
      { name: MessageRoom.name, schema: MessageRoomSchema },
      { name: Message.name, schema: MessageSchema },
      { name: ClassroomPost.name, schema: ClassroomPostSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Assignment.name, schema: AssignmentSchema },
    ]),
  ],
  controllers: [CoreController],
  providers: [CoreService],
  exports: [CoreService],
})
export class CoreModule {} 