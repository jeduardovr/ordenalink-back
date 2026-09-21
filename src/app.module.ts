import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { StaffUsersModule } from './modules/staff-users/staff-users.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { BusinessRegistrationController } from './modules/business-registration/business-registration.controller';
import { BusinessRegistrationService } from './modules/business-registration/business-registration.service';
import { BusinessRegistrationModule } from './modules/business-registration/business-registration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),

    AuthModule,
    UsersModule,
    BusinessesModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    StaffUsersModule,
    OnboardingModule,
    BusinessRegistrationModule
  ],
  controllers: [BusinessRegistrationController],
  providers: [BusinessRegistrationService],
})
export class AppModule {}