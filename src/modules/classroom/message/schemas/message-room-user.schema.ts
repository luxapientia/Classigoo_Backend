import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MessageRoom } from './message-room.schema';
import { User } from '../../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'message_room_users'
})
export class MessageRoomUser extends Document {
  @Prop({ type: Types.ObjectId, ref: MessageRoom.name, required: true })
  room_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user_id: Types.ObjectId;
}

export const MessageRoomUserSchema = SchemaFactory.createForClass(MessageRoomUser); 