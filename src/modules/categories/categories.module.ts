import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import {
  Category,
  CategorySchema,
} from './schemas/category.schema';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

import { AuthModule } from '../auth/auth.module';

import { StaffJwtGuard } from '../auth/guards/staff-jwt.guard';
import { StaffRolesGuard } from '../auth/guards/staff-roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
    AuthModule,
  ],

  controllers: [
    CategoriesController,
  ],

  providers: [
    CategoriesService,
    StaffJwtGuard,
    StaffRolesGuard,
  ],

  exports: [
    CategoriesService,
  ],
})
export class CategoriesModule {}