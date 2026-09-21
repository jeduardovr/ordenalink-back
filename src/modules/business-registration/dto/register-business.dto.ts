import { Type } from 'class-transformer';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CreateBusinessDto } from '../../businesses/dto/create-business.dto';

export class RegisterOwnerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

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
}

export class RegisterBusinessDto {
  @ValidateNested()
  @Type(() => CreateBusinessDto)
  business!: CreateBusinessDto;

  @ValidateNested()
  @Type(() => RegisterOwnerDto)
  owner!: RegisterOwnerDto;
}