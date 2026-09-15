import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Business,
  BusinessDocument,
} from './schemas/business.schema';
import { CreateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) { }

  async create(
    createBusinessDto: CreateBusinessDto,
  ): Promise<BusinessDocument> {
    try {
      return await this.businessModel.create(createBusinessDto);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ya existe un negocio con ese slug',
        );
      }

      throw error;
    }
  }

  async findBySlug(slug: string): Promise<BusinessDocument> {
    const business = await this.businessModel
      .findOne({
        slug: slug.toLowerCase(),
        active: true,
      })
      .exec();

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return business;
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

  async findById(id: string): Promise<BusinessDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'El identificador del negocio no es válido',
      );
    }

    const business = await this.businessModel.findById(id).exec();

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return business;
  }
}