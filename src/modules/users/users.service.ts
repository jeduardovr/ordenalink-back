import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  User,
  UserDocument,
} from './schemas/user.schema';
import { UserRole } from './enums/user-role.enum';

export interface GoogleUserData {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findOrCreateFromGoogle(
    googleUser: GoogleUserData,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findOneAndUpdate(
        {
          googleId: googleUser.googleId,
        },
        {
          $set: {
            email: googleUser.email.toLowerCase(),
            emailVerified: googleUser.emailVerified,
            name: googleUser.name,
            avatarUrl: googleUser.avatarUrl,
            lastLoginAt: new Date(),
          },
          $setOnInsert: {
            role: UserRole.CUSTOMER,
            active: true,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      )
      .exec();

    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'El identificador del usuario no es válido',
      );
    }

    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findByGoogleId(
    googleId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        googleId,
      })
      .exec();
  }
}