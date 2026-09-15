import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  LoginTicket,
  OAuth2Client,
} from 'google-auth-library';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client();
  }

  async loginWithGoogle(credential: string) {
    const googleClientId =
      this.configService.getOrThrow<string>(
        'GOOGLE_CLIENT_ID',
      );

    let ticket: LoginTicket;

    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
    } catch {
      throw new UnauthorizedException(
        'La credencial de Google no es válida',
      );
    }

    const payload = ticket.getPayload();

    if (
      !payload?.sub ||
      !payload.email ||
      !payload.email_verified
    ) {
      throw new UnauthorizedException(
        'Google no proporcionó un correo verificado',
      );
    }

    const user =
      await this.usersService.findOrCreateFromGoogle({
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        name:
          payload.name?.trim() ||
          payload.email.split('@')[0],
        avatarUrl: payload.picture,
      });

    if (!user.active) {
      throw new UnauthorizedException(
        'La cuenta se encuentra desactivada',
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user._id.toString(),
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }
}