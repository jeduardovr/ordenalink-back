import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BusinessDocument = HydratedDocument<Business>;

@Schema({ _id: false })
export class ThemeSettings {
  @Prop({ default: '#2563EB' })
  primaryColor!: string;

  @Prop({ default: '#FFFFFF' })
  backgroundColor!: string;

  @Prop({ default: '#111827' })
  textColor!: string;

  @Prop({ default: '#FFFFFF' })
  buttonTextColor!: string;

  @Prop({
    enum: ['square', 'rounded', 'pill'],
    default: 'rounded',
  })
  buttonStyle!: string;

  @Prop({
    enum: ['modern', 'compact', 'cards'],
    default: 'cards',
  })
  menuStyle!: string;
}

export const ThemeSettingsSchema =
  SchemaFactory.createForClass(ThemeSettings);

@Schema({ _id: false })
export class OrderSettings {
  @Prop({ default: true })
  dineInEnabled!: boolean;

  @Prop({ default: true })
  pickupEnabled!: boolean;

  @Prop({ default: false })
  deliveryByAgreementEnabled!: boolean;

  @Prop({ default: true })
  allowGuestCheckout!: boolean;

  @Prop({ default: true })
  requireCustomerName!: boolean;

  @Prop({ default: false })
  requireCustomerPhone!: boolean;

  @Prop({ default: 'Mesa' })
  tableLabel!: string;

  @Prop({
    default: 0,
    min: 0,
  })
  minimumOrderInCents!: number;

  @Prop({ default: 'MXN' })
  currency!: string;

  @Prop({ default: 'America/Tijuana' })
  timezone!: string;
}

export const OrderSettingsSchema =
  SchemaFactory.createForClass(OrderSettings);

@Schema({ _id: false })
export class LoyaltySettings {
  @Prop({ default: false })
  enabled!: boolean;

  @Prop({ default: 10, min: 1 })
  stampsRequired!: number;

  @Prop({ default: 'Producto gratis' })
  rewardDescription!: string;

  @Prop({ default: 0, min: 0 })
  minimumOrderAmount!: number;
}

export const LoyaltySettingsSchema =
  SchemaFactory.createForClass(LoyaltySettings);

@Schema({
  timestamps: true,
  collection: 'businesses',
})
export class Business {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  slug!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  coverUrl?: string;

  @Prop({ required: true })
  whatsappNumber!: string;

  @Prop({ default: true })
  active!: boolean;

  @Prop({
    type: ThemeSettingsSchema,
    default: () => ({}),
  })
  theme!: ThemeSettings;

  @Prop({
    type: OrderSettingsSchema,
    default: () => ({}),
  })
  orderSettings!: OrderSettings;

  @Prop({
    type: LoyaltySettingsSchema,
    default: () => ({}),
  })
  loyaltySettings!: LoyaltySettings;
}

export const BusinessSchema =
  SchemaFactory.createForClass(Business);

BusinessSchema.index({ slug: 1 }, { unique: true });
BusinessSchema.index({ ownerId: 1 });