import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlacklistDocument = Blacklist & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Blacklist {
  @Prop({ required: true, unique: true })
  ip_address: string;

  @Prop({ required: true, default: 0 })
  attempts: number;

  @Prop({ type: Date, default: null })
  blocked_until: Date | null;

  @Prop({ default: false })
  is_verified: boolean;

  @Prop({ default: false })
  is_blocked: boolean;

  @Prop({ default: false })
  is_permanently_blocked: boolean;

  created_at: Date;
  updated_at: Date;
}

export const BlacklistSchema = SchemaFactory.createForClass(Blacklist);

// Add pre-save hook for ipAddress formatting
BlacklistSchema.pre('save', function () {
  if (this.isNew) {
    this.ip_address = this.ip_address.toLowerCase().replace(/\s/g, '-');
  }
});
