import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Assignment } from './assignment.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'assignment_submissions'
})
export class AssignmentSubmission extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: Assignment.name })
  assignment_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: [Object], default: [] })
  files: any[];

  @Prop({ required: true, enum: ['draft', 'published'], default: 'draft' })
  status: string;
}

export const AssignmentSubmissionSchema = SchemaFactory.createForClass(AssignmentSubmission); 