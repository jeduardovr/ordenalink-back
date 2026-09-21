import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Order,
  OrderDocument,
  OrderItem,
  SelectedOption,
  SelectedVariant,
} from './schemas/order.schema';
import {
  OrderCounter,
  OrderCounterDocument,
} from './schemas/order-counter.schema';
import {
  CreateOrderDto,
  CreateOrderItemDto,
} from './dto/create-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { FulfillmentType } from './enums/fulfillment-type.enum';
import { BusinessesService } from '../businesses/businesses.service';
import { ProductsService } from '../products/products.service';
import { ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(OrderCounter.name)
    private readonly counterModel: Model<OrderCounterDocument>,

    private readonly businessesService: BusinessesService,
    private readonly productsService: ProductsService,
  ) { }

  async create(
    createOrderDto: CreateOrderDto,
    userId?: string,
  ) {
    const business = await this.businessesService.findById(
      createOrderDto.businessId,
    );

    if (!business.active) {
      throw new BadRequestException(
        'El negocio no está disponible',
      );
    }

    this.validateFulfillmentType(
      createOrderDto.fulfillmentType,
      createOrderDto.serviceReference,
      business.orderSettings,
    );

    if (
      business.orderSettings.requireCustomerName &&
      !createOrderDto.customerName?.trim()
    ) {
      throw new BadRequestException(
        'El nombre del cliente es obligatorio',
      );
    }

    if (
      business.orderSettings.requireCustomerPhone &&
      !createOrderDto.customerPhone?.trim()
    ) {
      throw new BadRequestException(
        'El teléfono del cliente es obligatorio',
      );
    }

    const items: OrderItem[] = [];

    for (const requestedItem of createOrderDto.items) {
      const product = await this.productsService.findOne(
        requestedItem.productId,
      );

      if (
        product.businessId.toString() !==
        createOrderDto.businessId
      ) {
        throw new BadRequestException(
          `El producto ${product.name} no pertenece al negocio`,
        );
      }

      if (!product.active || !product.available) {
        throw new BadRequestException(
          `El producto ${product.name} no está disponible`,
        );
      }

      if (
        product.trackStock &&
        product.stock < requestedItem.quantity
      ) {
        throw new BadRequestException(
          `No hay existencias suficientes de ${product.name}`,
        );
      }

      items.push(
        this.buildOrderItem(product, requestedItem),
      );
    }

    const subtotalInCents = items.reduce(
      (total, item) => total + item.lineTotalInCents,
      0,
    );

    if (
      subtotalInCents <
      business.orderSettings.minimumOrderInCents
    ) {
      throw new BadRequestException(
        `El pedido mínimo es ${this.formatMoney(
          business.orderSettings.minimumOrderInCents,
          business.orderSettings.currency,
        )}`,
      );
    }

    const orderNumber = await this.getNextOrderNumber(
      business._id.toString(),
    );

    const order = await this.orderModel.create({
      businessId: business._id,
      ...(userId && {
        userId: new Types.ObjectId(userId),
      }),
      orderNumber,
      customerName: createOrderDto.customerName?.trim(),
      customerPhone: createOrderDto.customerPhone?.trim(),
      fulfillmentType: createOrderDto.fulfillmentType,
      serviceReference:
        createOrderDto.serviceReference?.trim(),
      notes: createOrderDto.notes?.trim() ?? '',
      items,
      subtotalInCents,
      discountInCents: 0,
      totalInCents: subtotalInCents,
      currency: business.orderSettings.currency,
      status: OrderStatus.PENDING,
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          changedAt: new Date(),
        },
      ],
    });

    const whatsappMessage = this.buildWhatsappMessage(
      business.name,
      order,
    );

    const whatsappUrl =
      `https://wa.me/${business.whatsappNumber}` +
      `?text=${encodeURIComponent(whatsappMessage)}`;

    return {
      order,
      whatsappMessage,
      whatsappUrl,
    };
  }

  async findByBusiness(
    businessId: string,
  ): Promise<OrderDocument[]> {
    this.validateObjectId(businessId);

    return this.orderModel
      .find({
        businessId: new Types.ObjectId(businessId),
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  async findOne(
    id: string,
    businessId: string,
  ): Promise<OrderDocument> {
    this.validateObjectId(id);
    this.validateObjectId(businessId);

    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(id),
        businessId: new Types.ObjectId(businessId),
      })
      .exec();

    if (!order) {
      throw new NotFoundException(
        'Pedido no encontrado',
      );
    }

    return order;
  }

  private buildOrderItem(
    product: ProductDocument,
    requestedItem: CreateOrderItemDto,
  ): OrderItem {
    const effectivePrice =
      product.promotionalPriceInCents ??
      product.priceInCents;

    let unitTotalInCents = effectivePrice;
    let selectedVariant: SelectedVariant | undefined;

    if (requestedItem.selectedVariantId) {
      const variant = product.variants.find(
        (item) =>
          item._id.toString() ===
          requestedItem.selectedVariantId,
      );

      if (!variant || !variant.active) {
        throw new BadRequestException(
          `La variante seleccionada de ${product.name} no está disponible`,
        );
      }

      selectedVariant = {
        variantId: variant._id,
        name: variant.name,
        priceAdjustmentInCents:
          variant.priceAdjustmentInCents,
      };

      unitTotalInCents += variant.priceAdjustmentInCents;
    }

    const selectedOptions = this.resolveSelectedOptions(
      product,
      requestedItem,
    );

    unitTotalInCents += selectedOptions.reduce(
      (total, option) =>
        total + option.extraPriceInCents,
      0,
    );

    if (unitTotalInCents < 0) {
      throw new BadRequestException(
        `El precio calculado de ${product.name} no es válido`,
      );
    }

    return {
      productId: product._id,
      productName: product.name,
      quantity: requestedItem.quantity,
      basePriceInCents: effectivePrice,
      selectedVariant,
      selectedOptions,
      notes: requestedItem.notes?.trim() ?? '',
      unitTotalInCents,
      lineTotalInCents:
        unitTotalInCents * requestedItem.quantity,
    };
  }

  private resolveSelectedOptions(
    product: ProductDocument,
    requestedItem: CreateOrderItemDto,
  ): SelectedOption[] {
    const requestedGroups =
      requestedItem.selectedOptionGroups ?? [];

    const duplicatedGroups = requestedGroups.filter(
      (group, index, groups) =>
        groups.findIndex(
          (other) =>
            other.optionGroupId === group.optionGroupId,
        ) !== index,
    );

    if (duplicatedGroups.length > 0) {
      throw new BadRequestException(
        `Existen grupos de opciones duplicados en ${product.name}`,
      );
    }

    const result: SelectedOption[] = [];

    for (const productGroup of product.optionGroups) {
      const requestedGroup = requestedGroups.find(
        (group) =>
          group.optionGroupId ===
          productGroup._id.toString(),
      );

      const minimum = productGroup.required
        ? Math.max(productGroup.minSelections, 1)
        : productGroup.minSelections;

      const selectedIds = [
        ...new Set(requestedGroup?.optionIds ?? []),
      ];

      if (selectedIds.length < minimum) {
        throw new BadRequestException(
          `Debes seleccionar al menos ${minimum} opción(es) de ${productGroup.name}`,
        );
      }

      if (
        selectedIds.length > productGroup.maxSelections
      ) {
        throw new BadRequestException(
          `Solo puedes seleccionar ${productGroup.maxSelections} opción(es) de ${productGroup.name}`,
        );
      }

      for (const optionId of selectedIds) {
        const option = productGroup.options.find(
          (item) => item._id.toString() === optionId,
        );

        if (!option || !option.active) {
          throw new BadRequestException(
            `Una opción de ${productGroup.name} no está disponible`,
          );
        }

        result.push({
          optionGroupId: productGroup._id,
          optionGroupName: productGroup.name,
          optionId: option._id,
          name: option.name,
          extraPriceInCents: option.extraPriceInCents,
        });
      }
    }

    const validGroupIds = new Set(
      product.optionGroups.map((group) =>
        group._id.toString(),
      ),
    );

    const containsUnknownGroup = requestedGroups.some(
      (group) => !validGroupIds.has(group.optionGroupId),
    );

    if (containsUnknownGroup) {
      throw new BadRequestException(
        `Se recibió un grupo de opciones inválido para ${product.name}`,
      );
    }

    return result;
  }

  private validateFulfillmentType(
    fulfillmentType: FulfillmentType,
    serviceReference: string | undefined,
    settings: {
      dineInEnabled: boolean;
      pickupEnabled: boolean;
      deliveryByAgreementEnabled: boolean;
    },
  ): void {
    if (
      fulfillmentType === FulfillmentType.DINE_IN &&
      !settings.dineInEnabled
    ) {
      throw new BadRequestException(
        'El consumo en el lugar no está disponible',
      );
    }

    if (
      fulfillmentType === FulfillmentType.DINE_IN &&
      !serviceReference?.trim()
    ) {
      throw new BadRequestException(
        'Debes indicar la mesa o referencia de atención',
      );
    }

    if (
      fulfillmentType === FulfillmentType.PICKUP &&
      !settings.pickupEnabled
    ) {
      throw new BadRequestException(
        'La recolección no está disponible',
      );
    }

    if (
      fulfillmentType ===
      FulfillmentType.DELIVERY_BY_AGREEMENT &&
      !settings.deliveryByAgreementEnabled
    ) {
      throw new BadRequestException(
        'La entrega acordada no está disponible',
      );
    }
  }

  private async getNextOrderNumber(
    businessId: string,
  ): Promise<number> {
    const counter = await this.counterModel
      .findOneAndUpdate(
        {
          businessId: new Types.ObjectId(businessId),
        },
        {
          $inc: {
            sequence: 1,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return counter.sequence;
  }

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    businessId: string,
    changedBy: string,
  ): Promise<OrderDocument> {
    const order = await this.findOne(
      id,
      businessId,
    );

    const allowedTransitions: Record<
      OrderStatus,
      OrderStatus[]
    > = {
      [OrderStatus.PENDING]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PREPARING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PREPARING]: [
        OrderStatus.READY,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY]: [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowedStatuses =
      allowedTransitions[order.status];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar el pedido de ${order.status} a ${newStatus}`,
      );
    }

    order.status = newStatus;

    order.statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(changedBy),
    });

    if (newStatus === OrderStatus.CONFIRMED) {
      order.confirmedAt = new Date();
    }

    if (newStatus === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
    }

    if (newStatus === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
    }

    return order.save();
  }

  private buildWhatsappMessage(
    businessName: string,
    order: OrderDocument,
  ): string {
    const lines: string[] = [
      `🛒 NUEVO PEDIDO #${order.orderNumber}`,
      `🏪 ${businessName}`,
      '',
    ];

    if (order.customerName) {
      lines.push(`Cliente: ${order.customerName}`);
    }

    if (order.customerPhone) {
      lines.push(`Teléfono: ${order.customerPhone}`);
    }

    lines.push(
      `Tipo: ${this.getFulfillmentLabel(
        order.fulfillmentType,
      )}`,
    );

    if (order.serviceReference) {
      lines.push(`Referencia: ${order.serviceReference}`);
    }

    lines.push('', 'PRODUCTOS:');

    for (const item of order.items) {
      lines.push(
        `• ${item.quantity} x ${item.productName}`,
      );

      if (item.selectedVariant) {
        lines.push(`  Variante: ${item.selectedVariant.name}`);
      }

      for (const option of item.selectedOptions) {
        lines.push(
          `  ${option.optionGroupName}: ${option.name}`,
        );
      }

      if (item.notes) {
        lines.push(`  Nota: ${item.notes}`);
      }

      lines.push(
        `  ${this.formatMoney(
          item.lineTotalInCents,
          order.currency,
        )}`,
      );
    }

    lines.push(
      '',
      `TOTAL: ${this.formatMoney(
        order.totalInCents,
        order.currency,
      )}`,
    );

    if (order.notes) {
      lines.push('', `Notas generales: ${order.notes}`);
    }

    return lines.join('\n');
  }

  private getFulfillmentLabel(
    fulfillmentType: FulfillmentType,
  ): string {
    const labels: Record<FulfillmentType, string> = {
      [FulfillmentType.DINE_IN]:
        'Consumo en el lugar',
      [FulfillmentType.PICKUP]: 'Recolección',
      [FulfillmentType.DELIVERY_BY_AGREEMENT]:
        'Entrega por acordar',
    };

    return labels[fulfillmentType];
  }

  private formatMoney(
    amountInCents: number,
    currency: string,
  ): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amountInCents / 100);
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'El identificador proporcionado no es válido',
      );
    }
  }
}