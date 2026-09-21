import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { BusinessRegistrationService } from './business-registration.service';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Controller('business-registration')
export class BusinessRegistrationController {
  constructor(
    private readonly businessRegistrationService:
      BusinessRegistrationService,
  ) {}

  @Post()
  register(
    @Body()
    registerBusinessDto: RegisterBusinessDto,
  ) {
    return this.businessRegistrationService.register(
      registerBusinessDto,
    );
  }
}