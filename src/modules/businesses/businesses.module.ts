import {
  forwardRef,
  Module,
} from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import {
  Business,
  BusinessSchema,
} from './schemas/business.schema';

import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

import { AuthModule } from '../auth/auth.module';

import { StaffJwtGuard } from '../auth/guards/staff-jwt.guard';
import { StaffRolesGuard } from '../auth/guards/staff-roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Business.name,
        schema: BusinessSchema,
      },
    ]),
    forwardRef(() => AuthModule),
  ],

  controllers: [
    BusinessesController,
  ],

  providers: [
    BusinessesService,
    StaffJwtGuard,
    StaffRolesGuard,
  ],

  exports: [
    BusinessesService,
  ],
})
export class BusinessesModule {}