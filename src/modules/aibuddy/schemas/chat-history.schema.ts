import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatHistoryDocument = ChatHistory & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ChatHistory {
  @Prop({
    type: String,
    enum: ['system', 'user', 'assistant', 'developer'],
    required: true,
  })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  created_at: Date;
  updated_at: Date;
}

export const ChatHistorySchema = SchemaFactory.createForClass(ChatHistory); 