import { Module } from '@nestjs/common';

import { BusinessRegistrationController } from './business-registration.controller';
import { BusinessRegistrationService } from './business-registration.service';
import { BusinessesModule } from '../businesses/businesses.module';
import { StaffUsersModule } from '../staff-users/staff-users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BusinessesModule,
    StaffUsersModule,
    AuthModule,
  ],
  controllers: [
    BusinessRegistrationController,
  ],
  providers: [
    BusinessRegistrationService,
  ],
})
export class BusinessRegistrationModule {}