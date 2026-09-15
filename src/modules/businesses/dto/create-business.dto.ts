import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class ThemeSettingsDto {
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  backgroundColor?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  textColor?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  buttonTextColor?: string;

  @IsOptional()
  @IsIn(['square', 'rounded', 'pill'])
  buttonStyle?: string;

  @IsOptional()
  @IsIn(['modern', 'compact', 'cards'])
  menuStyle?: string;
}

export class OrderSettingsDto {
  @IsOptional()
  @IsBoolean()
  dineInEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  deliveryByAgreementEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowGuestCheckout?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCustomerName?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCustomerPhone?: boolean;

  @IsOptional()
  @IsString()
  tableLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumOrderInCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class LoyaltySettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  stampsRequired?: number;

  @IsOptional()
  @IsString()
  rewardDescription?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;
}

export class CreateBusinessDto {
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
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsString()
  @Matches(/^\d{10,15}$/, {
    message:
      'whatsappNumber debe contener únicamente números',
  })
  whatsappNumber!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeSettingsDto)
  theme?: ThemeSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderSettingsDto)
  orderSettings?: OrderSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LoyaltySettingsDto)
  loyaltySettings?: LoyaltySettingsDto;
}