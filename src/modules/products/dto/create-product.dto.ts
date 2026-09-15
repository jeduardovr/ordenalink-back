import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  priceAdjustmentInCents?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductOptionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  extraPriceInCents?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductOptionGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSelections?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelections?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionDto)
  options!: CreateProductOptionDto[];
}

export class CreateProductDto {
  @IsMongoId()
  businessId!: string;

  @IsMongoId()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug solo puede contener letras minúsculas, números y guiones',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

  @IsInt()
  @Min(0)
  priceInCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  promotionalPriceInCents?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionGroupDto)
  optionGroups?: CreateProductOptionGroupDto[];

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}