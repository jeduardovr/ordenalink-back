import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Product,
  ProductDocument,
} from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductDocument> {
    await this.validateCategoryBelongsToBusiness(
      createProductDto.categoryId,
      createProductDto.businessId,
    );

    this.validateProductConfiguration(createProductDto);

    try {
      return await this.productModel.create({
        ...createProductDto,
        businessId: new Types.ObjectId(
          createProductDto.businessId,
        ),
        categoryId: new Types.ObjectId(
          createProductDto.categoryId,
        ),
      });
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ya existe un producto con ese slug en el negocio',
        );
      }

      throw error;
    }
  }

  async findPublicByBusiness(
    businessId: string,
  ): Promise<ProductDocument[]> {
    this.validateObjectId(businessId);

    return this.productModel
      .find({
        businessId: new Types.ObjectId(businessId),
        active: true,
        available: true,
      })
      .sort({
        featured: -1,
        sortOrder: 1,
        name: 1,
      })
      .exec();
  }

  async findPublicByCategory(
    categoryId: string,
  ): Promise<ProductDocument[]> {
    this.validateObjectId(categoryId);

    return this.productModel
      .find({
        categoryId: new Types.ObjectId(categoryId),
        active: true,
        available: true,
      })
      .sort({
        featured: -1,
        sortOrder: 1,
        name: 1,
      })
      .exec();
  }

  async findOne(id: string): Promise<ProductDocument> {
    this.validateObjectId(id);

    const product = await this.productModel
      .findById(id)
      .exec();

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    const currentProduct = await this.findOne(id);

    const businessId =
      updateProductDto.businessId ??
      currentProduct.businessId.toString();

    const categoryId =
      updateProductDto.categoryId ??
      currentProduct.categoryId.toString();

    await this.validateCategoryBelongsToBusiness(
      categoryId,
      businessId,
    );

    this.validateProductConfiguration({
      priceInCents:
        updateProductDto.priceInCents ??
        currentProduct.priceInCents,
      promotionalPriceInCents:
        updateProductDto.promotionalPriceInCents ??
        currentProduct.promotionalPriceInCents,
      optionGroups:
        updateProductDto.optionGroups ??
        currentProduct.optionGroups,
    });

    try {
      const product = await this.productModel
        .findByIdAndUpdate(
          id,
          {
            ...updateProductDto,
            businessId: new Types.ObjectId(businessId),
            categoryId: new Types.ObjectId(categoryId),
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      return product;
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Ya existe un producto con ese slug en el negocio',
        );
      }

      throw error;
    }
  }

  async remove(id: string): Promise<ProductDocument> {
    this.validateObjectId(id);

    const product = await this.productModel
      .findByIdAndUpdate(
        id,
        {
          active: false,
          available: false,
        },
        {
          new: true,
        },
      )
      .exec();

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  private async validateCategoryBelongsToBusiness(
    categoryId: string,
    businessId: string,
  ): Promise<void> {
    this.validateObjectId(categoryId);
    this.validateObjectId(businessId);

    const category =
      await this.categoriesService.findOne(categoryId);

    if (category.businessId.toString() !== businessId) {
      throw new BadRequestException(
        'La categoría no pertenece al negocio indicado',
      );
    }

    if (!category.active) {
      throw new BadRequestException(
        'No se puede utilizar una categoría inactiva',
      );
    }
  }

  private validateProductConfiguration(product: {
    priceInCents: number;
    promotionalPriceInCents?: number;
    optionGroups?: Array<{
      minSelections?: number;
      maxSelections?: number;
    }>;
  }): void {
    if (
      product.promotionalPriceInCents !== undefined &&
      product.promotionalPriceInCents >= product.priceInCents
    ) {
      throw new BadRequestException(
        'El precio promocional debe ser menor al precio normal',
      );
    }

    for (const group of product.optionGroups ?? []) {
      const minimum = group.minSelections ?? 0;
      const maximum = group.maxSelections ?? 1;

      if (minimum > maximum) {
        throw new BadRequestException(
          'El mínimo de selecciones no puede superar al máximo',
        );
      }
    }
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