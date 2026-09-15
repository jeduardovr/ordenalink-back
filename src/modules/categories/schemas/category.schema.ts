import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
  timestamps: true,
  collection: 'categories',
})
export class Category {
  @Prop({
    type: Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

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

  @Prop({ default: '' })
  description!: string;

  @Prop()
  imageUrl?: string;

  @Prop({
    default: 0,
    min: 0,
  })
  sortOrder!: number;

  @Prop({ default: true })
  active!: boolean;
}

export const CategorySchema =
  SchemaFactory.createForClass(Category);

CategorySchema.index(
  {
    businessId: 1,
    slug: 1,
  },
  {
    unique: true,
  },
);

CategorySchema.index({
  businessId: 1,
  active: 1,
  sortOrder: 1,
});