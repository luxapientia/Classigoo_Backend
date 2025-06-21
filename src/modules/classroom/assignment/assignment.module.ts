import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { Assignment, AssignmentSchema } from './schemas/assignment.schema';
import { AssignmentSubmission, AssignmentSubmissionSchema } from './schemas/assignment-submission.schema';
import { Classroom, ClassroomSchema } from '../core/schemas/classroom.schema';
import { ClassroomAccess, ClassroomAccessSchema } from '../core/schemas/classroom-access.schema';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: Assignment.name, schema: AssignmentSchema },
      { name: AssignmentSubmission.name, schema: AssignmentSubmissionSchema },
      { name: Classroom.name, schema: ClassroomSchema },
      { name: ClassroomAccess.name, schema: ClassroomAccessSchema },
    ]),
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {} 