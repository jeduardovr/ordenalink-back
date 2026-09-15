import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Order,
  OrderSchema,
} from './schemas/order.schema';
import {
  OrderCounter,
  OrderCounterSchema,
} from './schemas/order-counter.schema';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BusinessesModule } from '../businesses/businesses.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: OrderCounter.name,
        schema: OrderCounterSchema,
      },
    ]),
    BusinessesModule,
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}