import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { FulfillmentType } from '../enums/fulfillment-type.enum';
import { OrderStatus } from '../enums/order-status.enum';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class SelectedVariant {
  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  variantId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  priceAdjustmentInCents!: number;
}

export const SelectedVariantSchema =
  SchemaFactory.createForClass(SelectedVariant);

@Schema({ _id: false })
export class SelectedOption {
  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  optionGroupId!: Types.ObjectId;

  @Prop({ required: true })
  optionGroupName!: string;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  optionId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  extraPriceInCents!: number;
}

export const SelectedOptionSchema =
  SchemaFactory.createForClass(SelectedOption);

@Schema({ _id: false })
export class OrderItem {
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  productName!: string;

  @Prop({
    required: true,
    min: 1,
  })
  quantity!: number;

  @Prop({
    required: true,
    min: 0,
  })
  basePriceInCents!: number;

  @Prop({
    type: SelectedVariantSchema,
  })
  selectedVariant?: SelectedVariant;

  @Prop({
    type: [SelectedOptionSchema],
    default: [],
  })
  selectedOptions!: SelectedOption[];

  @Prop({
    default: '',
  })
  notes!: string;

  @Prop({
    required: true,
    min: 0,
  })
  unitTotalInCents!: number;

  @Prop({
    required: true,
    min: 0,
  })
  lineTotalInCents!: number;
}

export const OrderItemSchema =
  SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class OrderStatusHistory {
  @Prop({
    required: true,
    enum: OrderStatus,
  })
  status!: OrderStatus;

  @Prop({
    required: true,
    default: Date.now,
  })
  changedAt!: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  changedBy?: Types.ObjectId;
}

export const OrderStatusHistorySchema =
  SchemaFactory.createForClass(OrderStatusHistory);

@Schema({
  timestamps: true,
  collection: 'orders',
})
export class Order {
  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({
    required: true,
  })
  orderNumber!: number;

  @Prop({
    trim: true,
  })
  customerName?: string;

  @Prop({
    trim: true,
  })
  customerPhone?: string;

  @Prop({
    required: true,
    enum: FulfillmentType,
  })
  fulfillmentType!: FulfillmentType;

  @Prop({
    trim: true,
  })
  serviceReference?: string;

  @Prop({
    default: '',
  })
  notes!: string;

  @Prop({
    type: [OrderItemSchema],
    required: true,
  })
  items!: OrderItem[];

  @Prop({
    required: true,
    min: 0,
  })
  subtotalInCents!: number;

  @Prop({
    default: 0,
    min: 0,
  })
  discountInCents!: number;

  @Prop({
    required: true,
    min: 0,
  })
  totalInCents!: number;

  @Prop({
    required: true,
    default: 'MXN',
  })
  currency!: string;

  @Prop({
    required: true,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    index: true,
  })
  status!: OrderStatus;

  @Prop({
    type: [OrderStatusHistorySchema],
    default: [],
  })
  statusHistory!: OrderStatusHistory[];

  @Prop({
    default: false,
  })
  loyaltyStampAwarded!: boolean;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;
}

export const OrderSchema =
  SchemaFactory.createForClass(Order);

OrderSchema.index(
  {
    businessId: 1,
    orderNumber: 1,
  },
  {
    unique: true,
  },
);

OrderSchema.index({
  businessId: 1,
  status: 1,
  createdAt: -1,
});

OrderSchema.index({
  userId: 1,
  createdAt: -1,
});