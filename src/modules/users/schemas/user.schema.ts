import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import {
  HydratedDocument,
} from 'mongoose';

import { UserRole } from '../enums/user-role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  googleId!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({
    required: true,
    default: false,
  })
  emailVerified!: boolean;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop()
  avatarUrl?: string;

  @Prop({
    required: true,
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema =
  SchemaFactory.createForClass(User);