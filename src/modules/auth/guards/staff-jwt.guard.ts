import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class StaffJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const token =
      this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Se requiere iniciar sesión',
      );
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(
          token,
        );

      if (
        payload.accountType !== 'STAFF' ||
        !payload.sub ||
        !payload.businessId ||
        !payload.role
      ) {
        throw new UnauthorizedException(
          'El token no pertenece a un trabajador',
        );
      }

      request.authUser = {
        id: payload.sub,
        accountType: 'STAFF',
        businessId: payload.businessId,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException(
        'La sesión no es válida o ha expirado',
      );
    }
  }

  private extractBearerToken(
    request: AuthenticatedRequest,
  ): string | undefined {
    const authorization =
      request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const [type, token] =
      authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}