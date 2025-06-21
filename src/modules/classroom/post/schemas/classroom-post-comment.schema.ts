import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Classroom } from '../../core/schemas/classroom.schema';
import { ClassroomPost } from './classroom-post.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'classroom_post_comments'
})
export class ClassroomPostComment extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: ClassroomPost.name })
  post_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: Classroom.name })
  class_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  content: string;
}

export const ClassroomPostCommentSchema = SchemaFactory.createForClass(ClassroomPostComment); 