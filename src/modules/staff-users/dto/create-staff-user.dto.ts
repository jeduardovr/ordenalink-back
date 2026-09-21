import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { StaffRole } from '../enums/staff-role.enum';

export class CreateStaffUserDto {
  @IsMongoId()
  businessId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'username solo puede contener letras, números, punto, guion y guion bajo',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;
}