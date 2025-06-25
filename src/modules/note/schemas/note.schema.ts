import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../../modules/auth/schemas/user.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'notes'
})
export class Note extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  owner_id: Types.ObjectId;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true, default: false })
  is_folder: boolean;

  @Prop({ required: true, default: false })
  is_public: boolean;

  @Prop({ required: false, default: null })
  parent_folder: string;

  @Prop({ required: true, type: [String], default: ['*'] })
  audience: string[];
}

export const NoteSchema = SchemaFactory.createForClass(Note); 