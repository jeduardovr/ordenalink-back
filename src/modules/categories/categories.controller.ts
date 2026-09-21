import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { StaffJwtGuard } from '../auth/guards/staff-jwt.guard';
import { StaffRolesGuard } from '../auth/guards/staff-roles.guard';
import { StaffRoles } from '../auth/decorators/staff-roles.decorator';

import type {
  AuthenticatedRequest,
  StaffAuthUser,
} from '../auth/interfaces/authenticated-request.interface';

import { StaffRole } from '../staff-users/enums/staff-role.enum';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  /*
   * Solo OWNER y MANAGER pueden crear categorías.
   * El businessId válido se obtiene del JWT.
   */
  @Post()
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
  )
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.categoriesService.create(
      createCategoryDto,
      staff.businessId,
    );
  }

  /*
   * Endpoint público para mostrar el menú.
   */
  @Get('business/:businessId')
  findByBusiness(
    @Param('businessId') businessId: string,
  ) {
    return this.categoriesService.findByBusiness(
      businessId,
    );
  }

  /*
   * Endpoint público para consultar una categoría.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  /*
   * Solo OWNER y MANAGER pueden modificar categorías.
   */
  @Patch(':id')
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
  )
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.categoriesService.update(
      id,
      updateCategoryDto,
      staff.businessId,
    );
  }

  /*
   * Baja lógica de la categoría.
   */
  @Delete(':id')
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
  )
  remove(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.categoriesService.remove(
      id,
      staff.businessId,
    );
  }

  private getStaffUser(
    request: AuthenticatedRequest,
  ): StaffAuthUser {
    const authUser = request.authUser;

    if (
      !authUser ||
      authUser.accountType !== 'STAFF'
    ) {
      throw new UnauthorizedException(
        'Se requiere una cuenta de trabajador',
      );
    }

    return authUser;
  }
}