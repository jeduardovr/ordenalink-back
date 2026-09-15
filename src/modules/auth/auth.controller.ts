import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('google')
  loginWithGoogle(
    @Body() googleAuthDto: GoogleAuthDto,
  ) {
    return this.authService.loginWithGoogle(
      googleAuthDto.credential,
    );
  }
}