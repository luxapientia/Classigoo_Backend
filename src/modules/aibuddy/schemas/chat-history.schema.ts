import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatHistoryDocument = ChatHistory & Document;

@Schema()
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
}

export const ChatHistorySchema = SchemaFactory.createForClass(ChatHistory); 