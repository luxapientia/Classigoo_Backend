import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type LimitDocument = Limit & Document;

@Schema()
export class Limit {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ default: 0 })
  request_count: number;

  @Prop({ default: Date.now })
  last_request_time: Date;

  @Prop({ default: Date.now })
  last_reset_time: Date;
}

export const LimitSchema = SchemaFactory.createForClass(Limit);