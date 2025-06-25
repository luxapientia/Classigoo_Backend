import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Note } from './note.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'classroom_notes'
})
export class ClassroomNote extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: Note.name })
  note_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  class_id: Types.ObjectId;
}

export const ClassroomNoteSchema = SchemaFactory.createForClass(ClassroomNote); 