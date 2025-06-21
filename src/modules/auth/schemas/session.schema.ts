import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserDocument } from './user.schema';

export type SessionDocument = Session & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Session {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  session_token: string;

  @Prop({ required: true })
  session_expiry: Date;

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

  created_at: Date;
  updated_at: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Add pre-save hook to update user's sessions
SessionSchema.pre('save', async function () {
  if (this.isNew) {
    const user = (await this.model('User').findOne({
      _id: this.user_id,
    })) as UserDocument;
    if (user) {
      if (!user.sessions?.includes(this._id)) {
        user.sessions.push(this._id);
        await user.save();
      }
    } else {
      throw new Error('User not found');
    }
  }
});
