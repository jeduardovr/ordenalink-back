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
import { compare } from 'bcryptjs';
import { StaffUsersService } from '../staff-users/staff-users.service';
import { BusinessesService } from '../businesses/businesses.service';
import { StaffLoginDto } from './dto/staff-login.dto';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly staffUsersService: StaffUsersService,
    private readonly businessesService: BusinessesService,
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
      accountType: 'CUSTOMER',
    });

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        accountType: 'CUSTOMER',
      },
    };
  }

  async loginStaff(staffLoginDto: StaffLoginDto) {
    const business =
      await this.businessesService.findBySlug(
        staffLoginDto.businessSlug,
      );

    const staffUser =
      await this.staffUsersService.findForAuthentication(
        business._id.toString(),
        staffLoginDto.username,
      );

    if (!staffUser) {
      throw new UnauthorizedException(
        'Negocio, usuario o contraseña incorrectos',
      );
    }

    const passwordIsValid = await compare(
      staffLoginDto.password,
      staffUser.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException(
        'Negocio, usuario o contraseña incorrectos',
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: staffUser._id.toString(),
      accountType: 'STAFF',
      businessId: business._id.toString(),
      role: staffUser.role,
    });

    await this.staffUsersService.updateLastLogin(
      staffUser._id.toString(),
    );

    return {
      accessToken,
      user: {
        id: staffUser._id.toString(),
        username: staffUser.username,
        name: staffUser.name,
        role: staffUser.role,
        accountType: 'STAFF',
      },
      business: {
        id: business._id.toString(),
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl,
      },
    };
  }
}