import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Model,
  Types,
} from 'mongoose';

import {
  Business,
  BusinessDocument,
} from './schemas/business.schema';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {}

  /*
   * Este método seguirá siendo utilizado internamente
   * por BusinessRegistrationService.
   */
  async create(
    createBusinessDto: CreateBusinessDto,
    session?: ClientSession,
  ): Promise<BusinessDocument> {
    try {
      const business = new this.businessModel(
        createBusinessDto,
      );

      return await business.save({
        session,
      });
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ya existe un negocio con ese slug',
        );
      }

      throw error;
    }
  }

  async findBySlug(
    slug: string,
  ): Promise<BusinessDocument> {
    const business = await this.businessModel
      .findOne({
        slug: slug.toLowerCase(),
        active: true,
      })
      .exec();

    if (!business) {
      throw new NotFoundException(
        'Negocio no encontrado',
      );
    }

    return business;
  }

  async findById(
    id: string,
  ): Promise<BusinessDocument> {
    this.validateObjectId(id);

    const business = await this.businessModel
      .findById(id)
      .exec();

    if (!business) {
      throw new NotFoundException(
        'Negocio no encontrado',
      );
    }

    return business;
  }

  async updateOwnedBusiness(
    businessId: string,
    ownerId: string,
    updateBusinessDto: UpdateBusinessDto,
  ): Promise<BusinessDocument> {
    this.validateObjectId(businessId);
    this.validateObjectId(ownerId);

    /*
     * Evita cambiar el propietario desde el body.
     */
    const updateData: Record<string, unknown> = {
      ...updateBusinessDto,
    };

    delete updateData.ownerId;
    delete updateData._id;

    if (
      typeof updateData.slug === 'string'
    ) {
      updateData.slug = updateData.slug
        .trim()
        .toLowerCase();
    }

    try {
      const business = await this.businessModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(businessId),
            ownerId: new Types.ObjectId(ownerId),
          },
          updateData,
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!business) {
        throw new NotFoundException(
          'Negocio no encontrado o no eres su propietario',
        );
      }

      return business;
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ya existe un negocio con ese slug',
        );
      }

      throw error;
    }
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'El identificador del negocio no es válido',
      );
    }
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