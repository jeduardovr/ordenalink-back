import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type ProductDocument =
  HydratedDocument<Product>;

@Schema()
export class ProductVariant {
  readonly _id!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    default: 0,
  })
  priceAdjustmentInCents!: number;

  @Prop({
    trim: true,
  })
  sku?: string;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop({
    default: 0,
    min: 0,
  })
  sortOrder!: number;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);

@Schema()
export class ProductOption {
  readonly _id!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    default: 0,
    min: 0,
  })
  extraPriceInCents!: number;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop({
    default: 0,
    min: 0,
  })
  sortOrder!: number;
}

export const ProductOptionSchema =
  SchemaFactory.createForClass(ProductOption);

@Schema()
export class ProductOptionGroup {
  readonly _id!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    default: false,
  })
  required!: boolean;

  @Prop({
    default: 0,
    min: 0,
  })
  minSelections!: number;

  @Prop({
    default: 1,
    min: 1,
  })
  maxSelections!: number;

  @Prop({
    type: [ProductOptionSchema],
    default: [],
  })
  options!: ProductOption[];
}

export const ProductOptionGroupSchema =
  SchemaFactory.createForClass(
    ProductOptionGroup,
  );

@Schema({
  timestamps: true,
  collection: 'products',
})
export class Product {
  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  slug!: string;

  @Prop({
    default: '',
    trim: true,
  })
  description!: string;

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];

  @Prop({
    required: true,
    min: 0,
  })
  priceInCents!: number;

  @Prop({
    min: 0,
  })
  promotionalPriceInCents?: number;

  @Prop({
    type: [ProductVariantSchema],
    default: [],
  })
  variants!: ProductVariant[];

  @Prop({
    type: [ProductOptionGroupSchema],
    default: [],
  })
  optionGroups!: ProductOptionGroup[];

  @Prop({
    default: false,
  })
  trackStock!: boolean;

  @Prop({
    default: 0,
    min: 0,
  })
  stock!: number;

  @Prop({
    default: true,
  })
  available!: boolean;

  @Prop({
    default: false,
  })
  featured!: boolean;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop({
    default: 0,
    min: 0,
  })
  sortOrder!: number;
}

export const ProductSchema =
  SchemaFactory.createForClass(Product);

ProductSchema.index(
  {
    businessId: 1,
    slug: 1,
  },
  {
    unique: true,
  },
);

ProductSchema.index({
  businessId: 1,
  categoryId: 1,
  active: 1,
  available: 1,
  sortOrder: 1,
});