import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { MemberModule } from './member/member.module';
import { ExamModule } from './exam/exam.module';
import { AssignmentModule } from './assignment/assignment.module';
import { MessageModule } from './message/message.module';
import { PostModule } from './post/post.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [CoreModule, MemberModule, ExamModule, AssignmentModule, MessageModule, PostModule, ScheduleModule],
  exports: [CoreModule, MemberModule, ExamModule, AssignmentModule, MessageModule, PostModule, ScheduleModule]
})
export class ClassroomModule {}
