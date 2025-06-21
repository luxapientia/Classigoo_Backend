import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exam } from './exam.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'exam_submissions'
})
export class ExamSubmission extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: Exam.name })
  exam_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  answers: any[];

  @Prop({ type: [Object], default: [] })
  markings: any[];

  @Prop({ required: true })
  status: string;
}

export const ExamSubmissionSchema = SchemaFactory.createForClass(ExamSubmission); 