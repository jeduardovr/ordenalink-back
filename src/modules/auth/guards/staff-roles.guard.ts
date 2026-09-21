import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { STAFF_ROLES_KEY } from '../decorators/staff-roles.decorator';
import { StaffRole } from '../../staff-users/enums/staff-role.enum';

@Injectable()
export class StaffRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<StaffRole[]>(
        STAFF_ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredRoles?.length) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authUser = request.authUser;

    if (!authUser || authUser.accountType !== 'STAFF') {
      throw new ForbiddenException(
        'Esta operación requiere una cuenta de trabajador',
      );
    }

    if (!requiredRoles.includes(authUser.role)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta operación',
      );
    }

    return true;
  }
}