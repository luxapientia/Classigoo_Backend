import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../../auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'classroom_access'
})
export class ClassroomAccess extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Classroom' })
  class_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true, enum: ['owner', 'teacher', 'student'] })
  role: string;

  @Prop({ required: true, enum: ['pending', 'accepted', 'rejected'] })
  status: string;
}

export const ClassroomAccessSchema = SchemaFactory.createForClass(ClassroomAccess); 