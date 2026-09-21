import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';

import { RegisterBusinessDto } from './dto/register-business.dto';
import { BusinessesService } from '../businesses/businesses.service';
import { StaffUsersService } from '../staff-users/staff-users.service';
import { StaffRole } from '../staff-users/enums/staff-role.enum';

export interface BusinessRegistrationResult {
  accessToken: string;

  business: {
    id: string;
    name: string;
    slug: string;
  };

  user: {
    id: string;
    username: string;
    name: string;
    role: StaffRole;
    accountType: 'STAFF';
  };
}

@Injectable()
export class BusinessRegistrationService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    private readonly businessesService:
      BusinessesService,

    private readonly staffUsersService:
      StaffUsersService,

    private readonly jwtService: JwtService,
  ) { }

  async register(
    registerBusinessDto: RegisterBusinessDto,
  ): Promise<BusinessRegistrationResult> {
    const session =
      await this.connection.startSession();

    let result:
      | BusinessRegistrationResult
      | undefined;

    try {
      await session.withTransaction(async () => {
        const business =
          await this.businessesService.create(
            registerBusinessDto.business,
            session,
          );

        const owner =
          await this.staffUsersService.create(
            {
              businessId: business._id.toString(),
              username:
                registerBusinessDto.owner.username,
              password:
                registerBusinessDto.owner.password,
              name: registerBusinessDto.owner.name,
              role: StaffRole.OWNER,
            },
            session,
          );

        business.ownerId = owner._id;

        await business.save({
          session,
        });

        const accessToken =
          await this.jwtService.signAsync({
            sub: owner._id.toString(),
            accountType: 'STAFF',
            businessId: business._id.toString(),
            role: owner.role,
          });

        result = {
          accessToken,
          business: {
            id: business._id.toString(),
            name: business.name,
            slug: business.slug,
          },
          user: {
            id: owner._id.toString(),
            username: owner.username,
            name: owner.name,
            role: owner.role,
            accountType: 'STAFF',
          },
        };
      });
    } finally {
      await session.endSession();
    }

    if (!result) {
      throw new Error(
        'No fue posible completar el registro del negocio',
      );
    }

    return result;
  }
}