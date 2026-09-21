import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

import { StaffJwtGuard } from '../auth/guards/staff-jwt.guard';
import { StaffRolesGuard } from '../auth/guards/staff-roles.guard';
import { StaffRoles } from '../auth/decorators/staff-roles.decorator';

import type {
  AuthenticatedRequest,
  StaffAuthUser,
} from '../auth/interfaces/authenticated-request.interface';

import { StaffRole } from '../staff-users/enums/staff-role.enum';

@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
  ) {}

  /*
   * Modifica el negocio del propietario autenticado.
   *
   * PATCH /api/businesses/me
   */
  @Patch('me')
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(StaffRole.OWNER)
  updateMyBusiness(
    @Body() updateBusinessDto: UpdateBusinessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.businessesService.updateOwnedBusiness(
      staff.businessId,
      staff.id,
      updateBusinessDto,
    );
  }

  /*
   * Endpoint público para obtener el negocio por slug.
   */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.businessesService.findBySlug(slug);
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