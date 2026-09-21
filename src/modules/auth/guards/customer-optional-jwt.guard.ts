import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../../users/users.service';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class CustomerOptionalJwtGuard
  implements CanActivate
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization =
      request.headers.authorization;

    if (!authorization) {
      return true;
    }

    const [type, token] =
      authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'El encabezado de autorización no es válido',
      );
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(
          token,
        );

      if (
        payload.accountType !== 'CUSTOMER' ||
        !payload.sub
      ) {
        throw new UnauthorizedException(
          'El token no pertenece a un cliente',
        );
      }

      const customer =
        await this.usersService.findById(
          payload.sub,
        );

      if (!customer.active) {
        throw new UnauthorizedException(
          'La cuenta se encuentra desactivada',
        );
      }

      request.authUser = {
        id: customer._id.toString(),
        accountType: 'CUSTOMER',
      };

      return true;
    } catch {
      throw new UnauthorizedException(
        'La sesión del cliente no es válida o ha expirado',
      );
    }
  }
}