import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { StaffLoginDto } from './dto/staff-login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('customers/google')
  loginCustomerWithGoogle(
    @Body() googleAuthDto: GoogleAuthDto,
  ) {
    return this.authService.loginWithGoogle(
      googleAuthDto.credential,
    );
  }

  @Post('staff/login')
  loginStaff(
    @Body() staffLoginDto: StaffLoginDto,
  ) {
    return this.authService.loginStaff(
      staffLoginDto,
    );
  }
}