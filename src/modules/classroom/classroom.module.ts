import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { MemberModule } from './member/member.module';
import { ExamModule } from './exam/exam.module';
import { AssignmentModule } from './assignment/assignment.module';
import { MessageModule } from './message/message.module';
import { PostModule } from './post/post.module';

@Module({
  imports: [CoreModule, MemberModule, ExamModule, AssignmentModule, MessageModule, PostModule],
  exports: [CoreModule, MemberModule, ExamModule, AssignmentModule, MessageModule, PostModule]
})
export class ClassroomModule {}
