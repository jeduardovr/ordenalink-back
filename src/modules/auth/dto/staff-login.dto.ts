import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StaffLoginDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'businessSlug no tiene un formato válido',
  })
  businessSlug!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}