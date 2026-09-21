import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { hash } from 'bcryptjs';

import {
  ClientSession,
  Model,
  Types,
} from 'mongoose';

import {
  StaffUser,
  StaffUserDocument,
} from './schemas/staff-user.schema';

import { CreateStaffUserDto } from './dto/create-staff-user.dto';

@Injectable()
export class StaffUsersService {
  constructor(
    @InjectModel(StaffUser.name)
    private readonly staffUserModel: Model<StaffUserDocument>,
  ) {}

  async create(
    createStaffUserDto: CreateStaffUserDto,
    session?: ClientSession,
  ): Promise<StaffUserDocument> {
    const passwordHash = await hash(
      createStaffUserDto.password,
      12,
    );

    try {
      const staffUser = new this.staffUserModel({
        businessId: new Types.ObjectId(
          createStaffUserDto.businessId,
        ),
        username:
          createStaffUserDto.username.toLowerCase(),
        passwordHash,
        name: createStaffUserDto.name.trim(),
        role: createStaffUserDto.role,
      });

      return await staffUser.save({
        session,
      });
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ese nombre de usuario ya existe en el negocio',
        );
      }

      throw error;
    }
  }

  async findForAuthentication(
    businessId: string,
    username: string,
  ): Promise<StaffUserDocument | null> {
    if (!Types.ObjectId.isValid(businessId)) {
      return null;
    }

    return this.staffUserModel
      .findOne({
        businessId: new Types.ObjectId(businessId),
        username: username.toLowerCase(),
        active: true,
      })
      .select('+passwordHash')
      .exec();
  }

  async findById(
    id: string,
  ): Promise<StaffUserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'El identificador del trabajador no es válido',
      );
    }

    const staffUser =
      await this.staffUserModel
        .findById(id)
        .exec();

    if (!staffUser) {
      throw new NotFoundException(
        'Trabajador no encontrado',
      );
    }

    return staffUser;
  }

  async updateLastLogin(
    id: string,
  ): Promise<void> {
    await this.staffUserModel
      .findByIdAndUpdate(id, {
        lastLoginAt: new Date(),
      })
      .exec();
  }

  private isDuplicateKeyError(
    error: unknown,
  ): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}