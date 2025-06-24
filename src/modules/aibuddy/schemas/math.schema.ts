import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ChatHistory, ChatHistorySchema } from './chat-history.schema';

export type MathDocument = MathAI & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'maths',
})
export class MathAI {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  chat_name: string;

  @Prop({ type: [ChatHistorySchema], required: true })
  chat_history: ChatHistory[];

  created_at: Date;
  updated_at: Date;
}

export const MathSchema = SchemaFactory.createForClass(MathAI); 