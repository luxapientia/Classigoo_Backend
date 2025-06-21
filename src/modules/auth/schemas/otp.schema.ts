import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Otp {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true })
  session_token: string;

  @Prop({ default: false })
  session_remember_me: boolean;

  @Prop({ type: Object, required: true })
  security: {
    ip: string;
    platform?: string;
    os?: string;
    device?: string;
    location?: string;
  };

  @Prop({ default: null })
  push_token?: string;

  @Prop({ default: false })
  expired: boolean;

  @Prop({ default: false })
  used: boolean;

  created_at: Date;
  updated_at: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Add pre-save hook for updatedAt
OtpSchema.pre('updateOne', function (next) {
  this.set({ updated_at: new Date() });

  next();
});
