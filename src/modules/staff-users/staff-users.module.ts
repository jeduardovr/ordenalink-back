import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import {
  StaffUser,
  StaffUserSchema,
} from './schemas/staff-user.schema';

import { StaffUsersService } from './staff-users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: StaffUser.name,
        schema: StaffUserSchema,
      },
    ]),
  ],

  providers: [
    StaffUsersService,
  ],

  exports: [
    StaffUsersService,
  ],
})
export class StaffUsersModule {}