import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../../../modules/auth/schemas/user.schema';
import { Classroom } from '../../core/schemas/classroom.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'schedules'
})
export class Schedule extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  owner_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: Classroom.name })
  class_id: Types.ObjectId;

  @Prop({ required: true, type: Date })
  start_time: Date;

  @Prop({ required: true, type: Date })
  end_time: Date;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule); 