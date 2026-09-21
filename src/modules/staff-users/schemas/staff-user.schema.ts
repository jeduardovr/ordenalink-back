import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import {
  HydratedDocument,
  Types,
} from 'mongoose';

import { StaffRole } from '../enums/staff-role.enum';

export type StaffUserDocument =
  HydratedDocument<StaffUser>;

@Schema({
  timestamps: true,
  collection: 'staff_users',
})
export class StaffUser {
  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  username!: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    enum: StaffRole,
    default: StaffRole.EMPLOYEE,
  })
  role!: StaffRole;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  lastLoginAt?: Date;
}

export const StaffUserSchema =
  SchemaFactory.createForClass(StaffUser);

StaffUserSchema.index(
  {
    businessId: 1,
    username: 1,
  },
  {
    unique: true,
  },
);

StaffUserSchema.index({
  businessId: 1,
  active: 1,
  role: 1,
});