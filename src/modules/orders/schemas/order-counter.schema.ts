import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderCounterDocument =
  HydratedDocument<OrderCounter>;

@Schema({
  timestamps: true,
  collection: 'order_counters',
})
export class OrderCounter {
  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    required: true,
    unique: true,
  })
  businessId!: Types.ObjectId;

  @Prop({
    required: true,
    default: 0,
    min: 0,
  })
  sequence!: number;
}

export const OrderCounterSchema =
  SchemaFactory.createForClass(OrderCounter);