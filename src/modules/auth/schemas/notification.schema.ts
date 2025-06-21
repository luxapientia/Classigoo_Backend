import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AuthNotificationDocument = AuthNotification & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'auth_notifications',
})
export class AuthNotification {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ default: 'icon', enum: ['icon', 'image'] })
  icon_type: string;

  @Prop({ default: null })
  icon?: string;

  @Prop({ default: null })
  icon_color?: string;

  @Prop({ default: null })
  icon_bgcolor?: string;

  @Prop({ default: null })
  image_url?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: null })
  link?: string;

  @Prop({ required: true, default: false })
  is_read: boolean;

  created_at: Date;
  updated_at: Date;
}

export const AuthNotificationSchema =
  SchemaFactory.createForClass(AuthNotification);

// Add pre-update hook for updatedAt
AuthNotificationSchema.pre('updateOne', function (next) {
  this.set({ updated_at: new Date() });

  next();
});
