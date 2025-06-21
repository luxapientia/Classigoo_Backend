import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { Exam, ExamSchema } from './schemas/exam.schema';
import { ExamSubmission, ExamSubmissionSchema } from './schemas/exam-submission.schema';
import { Classroom, ClassroomSchema } from '../core/schemas/classroom.schema';
import { ClassroomAccess, ClassroomAccessSchema } from '../core/schemas/classroom-access.schema';
import { SharedModule } from '../../../shared/shared.module'; 

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: ExamSubmission.name, schema: ExamSubmissionSchema },
      { name: Classroom.name, schema: ClassroomSchema },
      { name: ClassroomAccess.name, schema: ClassroomAccessSchema },
    ]),
  ],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {} 