import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Classroom } from '../../core/schemas/classroom.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'message_rooms'
})
export class MessageRoom extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['all', 'single'] })
  type: string;

  @Prop({ type: Types.ObjectId, ref: Classroom.name, required: true })
  classroom_id: Types.ObjectId;

  @Prop({ required: true })
  active_at: Date;
}

export const MessageRoomSchema = SchemaFactory.createForClass(MessageRoom); 