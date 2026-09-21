import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

import { CustomerOptionalJwtGuard } from '../auth/guards/customer-optional-jwt.guard';
import { StaffJwtGuard } from '../auth/guards/staff-jwt.guard';
import { StaffRolesGuard } from '../auth/guards/staff-roles.guard';
import { StaffRoles } from '../auth/decorators/staff-roles.decorator';

import type {
  AuthenticatedRequest,
  StaffAuthUser,
} from '../auth/interfaces/authenticated-request.interface';

import { StaffRole } from '../staff-users/enums/staff-role.enum';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) { }

  /*
   * Endpoint público.
   * Permite crear pedidos como invitado o como cliente Google.
   */
  @Post()
  @UseGuards(CustomerOptionalJwtGuard)
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const customerId =
      request.authUser?.accountType === 'CUSTOMER'
        ? request.authUser.id
        : undefined;

    return this.ordersService.create(
      createOrderDto,
      customerId,
    );
  }

  /*
   * Lista pedidos del negocio asociado al trabajador.
   *
   * GET /api/orders/business
   */
  @Get('business')
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
    StaffRole.EMPLOYEE,
  )
  findByBusiness(
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.ordersService.findByBusiness(
      staff.businessId,
    );
  }

  /*
   * Consulta un pedido siempre que pertenezca
   * al negocio del trabajador.
   */
  @Get(':id')
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
    StaffRole.EMPLOYEE,
  )
  findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.ordersService.findOne(
      id,
      staff.businessId,
    );
  }

  /*
   * Cambia el estado de un pedido del negocio.
   * Guarda también qué trabajador realizó el cambio.
   */
  @Patch(':id/status')
  @UseGuards(StaffJwtGuard, StaffRolesGuard)
  @StaffRoles(
    StaffRole.OWNER,
    StaffRole.MANAGER,
    StaffRole.EMPLOYEE,
  )
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const staff = this.getStaffUser(request);

    return this.ordersService.updateStatus(
      id,
      updateOrderStatusDto.status,
      staff.businessId,
      staff.id,
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