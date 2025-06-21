import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Classroom } from '../../core/schemas/classroom.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})
export class Exam extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, type: Types.ObjectId, ref: Classroom.name })
  class_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  owner_id: Types.ObjectId;

  @Prop({ required: true, type: [String], default: ['*'] })
  audience: string[];

  @Prop({ required: true, type: [Object] })
  questions: any[];

  @Prop({ required: true })
  duration: number;

  @Prop()
  start_once?: Date;

  @Prop({ required: true, enum: ['draft', 'published'], default: 'draft' })
  status: string;
}

export const ExamSchema = SchemaFactory.createForClass(Exam); 