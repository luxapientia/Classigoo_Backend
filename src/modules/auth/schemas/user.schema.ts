import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    required: true,
    enum: ['user', 'parent', 'student', 'teacher', 'admin'],
    default: 'user',
  })
  role: string;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender?: string;

  @Prop({ type: Object, default: { bucketKey: '', url: '' } })
  avatar: {
    bucketKey: string;
    url: string;
  };

  @Prop({ default: '' })
  birthday?: string;

  @Prop({ default: '' })
  phone?: string;

  @Prop({ default: '' })
  institution?: string;

  @Prop({ default: '' })
  bio?: string;

  @Prop({ type: Object })
  address?: {
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    country?: string;
  };

  @Prop({ enum: ['active', 'banned', 'deleted', 'pending'], default: 'active' })
  status: string;

  @Prop({ default: false })
  is_plus: boolean;

  @Prop({ default: false })
  used_trial: boolean;

  @Prop({ type: Object })
  subscription: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    status?: string;
    current_period_start?: Date;
    current_period_end?: Date;
    trial_start?: Date;
    trial_end?: Date;
    canceled_at?: Date;
    updated_at?: Date;
  };

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  children: string[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  parents: string[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Classroom' }] })
  classrooms: string[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Session' }] })
  sessions: Types.ObjectId[];

  created_at: Date;
  updated_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add toJSON transform to remove sensitive data
UserSchema.methods.toJSON = function () {
  const user = this.toObject();

  // Delete sessions from response
  delete user.sessions;

  // If teacher remove parent and children
  if (user.role === 'teacher') {
    delete user.parents;
    delete user.children;
  }

  // If student remove children
  // if (user.role === 'student') {
  //   delete user.children;
  // }

  // If parent remove parent & classrooms
  if (user.role === 'parent') {
    delete user.parents;
    delete user.classrooms;
  }

  return user as User;
};

// Add pre-save hook for updatedAt
UserSchema.pre('updateOne', function () {
  this.set({ updated_at: new Date() });
});
