import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Classroom } from '../../core/schemas/classroom.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'classroom_posts'
})
export class ClassroomPost extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: Classroom.name })
  classroom_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, type: [String], default: ['*'] })
  audience: string[];

  @Prop({ required: true })
  status: string;

  @Prop({ required: true, type: [Object], default: [] })
  files: any[];

  @Prop({ required: true })
  published_at: Date;
}

export const ClassroomPostSchema = SchemaFactory.createForClass(ClassroomPost); 