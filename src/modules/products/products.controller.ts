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

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { StaffJwtGuard } from '../auth/guards/staff-jwt.guard';
import { StaffRolesGuard } from '../auth/guards/staff-roles.guard';
import { StaffRoles } from '../auth/decorators/staff-roles.decorator';

import type {
  AuthenticatedRequest,
  StaffAuthUser,
} from '../auth/interfaces/authenticated-request.interface';

import { StaffRole } from '../staff-users/enums/staff-role.enum';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Post()
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
  )
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.productsService.create(
      createProductDto,
      staff.businessId,
    );
  }

  /*
   * Endpoint público del catálogo.
   */
  @Get('business/:businessId')
  findPublicByBusiness(
    @Param('businessId') businessId: string,
  ) {
    return this.productsService.findPublicByBusiness(
      businessId,
    );
  }

  /*
   * Endpoint público del catálogo.
   */
  @Get('category/:categoryId')
  findPublicByCategory(
    @Param('categoryId') categoryId: string,
  ) {
    return this.productsService.findPublicByCategory(
      categoryId,
    );
  }

  /*
   * Se mantiene público porque es información del menú.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
  )
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.productsService.update(
      id,
      updateProductDto,
      staff.businessId,
    );
  }

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

    return this.productsService.remove(
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