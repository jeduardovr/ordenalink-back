import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { FulfillmentType } from '../enums/fulfillment-type.enum';

export class SelectedOptionGroupDto {
  @IsMongoId()
  optionGroupId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  optionIds!: string[];
}

export class CreateOrderItemDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @IsOptional()
  @IsMongoId()
  selectedVariantId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionGroupDto)
  selectedOptionGroups?: SelectedOptionGroupDto[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

export class CreateOrderDto {
  @IsMongoId()
  businessId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message:
      'customerPhone debe contener únicamente números',
  })
  customerPhone?: string;

  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}