import {
  forwardRef,
  Module,
} from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { UsersModule } from '../users/users.module';
import { StaffUsersModule } from '../staff-users/staff-users.module';
import { BusinessesModule } from '../businesses/businesses.module';

import { StaffJwtGuard } from './guards/staff-jwt.guard';
import { CustomerOptionalJwtGuard } from './guards/customer-optional-jwt.guard';
import { StaffRolesGuard } from './guards/staff-roles.guard';

@Module({
  imports: [
    ConfigModule,

    UsersModule,

    StaffUsersModule,

    forwardRef(() => BusinessesModule),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService,
      ) => ({
        secret:
          configService.getOrThrow<string>(
            'JWT_SECRET',
          ),
        signOptions: {
          expiresIn: 60 * 60 * 24 * 7,
        },
      }),
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    StaffJwtGuard,
    StaffRolesGuard,
    CustomerOptionalJwtGuard,
  ],

  exports: [
    AuthService,
    JwtModule,
    StaffJwtGuard,
    StaffRolesGuard,
    CustomerOptionalJwtGuard,
  ],
})
export class AuthModule {}