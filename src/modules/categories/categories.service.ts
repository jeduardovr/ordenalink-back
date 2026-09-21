import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Category,
  CategoryDocument,
} from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    businessId: string,
  ): Promise<CategoryDocument> {
    this.validateObjectId(businessId);

    try {
      return await this.categoryModel.create({
        ...createCategoryDto,

        /*
         * Se coloca después del DTO para sobrescribir cualquier
         * businessId enviado desde el frontend.
         */
        businessId: new Types.ObjectId(businessId),
      });
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ya existe una categoría con ese slug en el negocio',
        );
      }

      throw error;
    }
  }

  /*
   * Consulta pública para construir el menú.
   */
  async findByBusiness(
    businessId: string,
  ): Promise<CategoryDocument[]> {
    this.validateObjectId(businessId);

    return this.categoryModel
      .find({
        businessId: new Types.ObjectId(businessId),
        active: true,
      })
      .sort({
        sortOrder: 1,
        name: 1,
      })
      .exec();
  }

  /*
   * Consulta pública individual.
   */
  async findOne(
    id: string,
  ): Promise<CategoryDocument> {
    this.validateObjectId(id);

    const category = await this.categoryModel
      .findById(id)
      .exec();

    if (!category) {
      throw new NotFoundException(
        'Categoría no encontrada',
      );
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    businessId: string,
  ): Promise<CategoryDocument> {
    this.validateObjectId(id);
    this.validateObjectId(businessId);

    /*
     * Evita que el negocio de una categoría pueda cambiarse
     * aunque businessId venga dentro del body.
     */
    const updateData = {
      ...updateCategoryDto,
    };

    delete updateData.businessId;

    try {
      const category = await this.categoryModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(id),
            businessId: new Types.ObjectId(businessId),
          },
          updateData,
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!category) {
        throw new NotFoundException(
          'Categoría no encontrada',
        );
      }

      return category;
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ya existe una categoría con ese slug en el negocio',
        );
      }

      throw error;
    }
  }

  async remove(
    id: string,
    businessId: string,
  ): Promise<CategoryDocument> {
    this.validateObjectId(id);
    this.validateObjectId(businessId);

    const category = await this.categoryModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          businessId: new Types.ObjectId(businessId),
        },
        {
          active: false,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!category) {
      throw new NotFoundException(
        'Categoría no encontrada',
      );
    }

    return category;
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'El identificador proporcionado no es válido',
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