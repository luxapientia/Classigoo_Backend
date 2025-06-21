import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})
export class Notification extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ default: null })
  image: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: false })
  link: string;

  @Prop({ required: false })
  is_read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification); 