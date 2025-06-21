import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../../auth/schemas/user.schema';
import { ClassroomAccess } from './classroom-access.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
export class Classroom extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  room?: string;

  @Prop()
  section?: string;

  @Prop()
  subject?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  owner: Types.ObjectId;

  @Prop({ default: false })
  child_only: boolean;

  @Prop({ required: true })
  invitation_code: string;

  @Prop({ required: true })
  cover_img: string;

  classroom_relation?: ClassroomAccess[];
}

export const ClassroomSchema = SchemaFactory.createForClass(Classroom);

// Add virtual field for classroom_relation
ClassroomSchema.virtual('classroom_relation', {
  ref: 'ClassroomAccess',
  localField: '_id',
  foreignField: 'class_id'
}); 