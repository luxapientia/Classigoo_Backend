import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ChildParentDocument = ChildParent & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ChildParent {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  child_id: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  parent_id: string;

  @Prop({ enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: string;

  created_at: Date;
  updated_at: Date;
}

export const ChildParentSchema = SchemaFactory.createForClass(ChildParent);

// Add pre-save hook for updatedAt
ChildParentSchema.pre('updateOne', function () {
  this.set({ updated_at: new Date() });
}); 