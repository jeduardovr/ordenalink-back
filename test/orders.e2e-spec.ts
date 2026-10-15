import type { INestApplication } from '@nestjs/common';
import {
  createCategory,
  createProduct,
  dineInOrder,
  http,
  registerBusiness,
  type RegisteredBusiness,
} from './support/fixtures';
import { closeTestApp, createTestApp } from './support/test-app';

type ProductWithOptions = {
  _id: string;
  variants: { _id: string }[];
  optionGroups: { _id: string; options: { _id: string }[] }[];
};

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let owner: RegisteredBusiness;
  let categoryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    owner = await registerBusiness(app);
    categoryId = await createCategory(app, owner);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  const placeOrder = (body: Record<string, unknown>) =>
    http(app).post('/orders', body);

  describe('pricing (always computed by the server)', () => {
    let latte: ProductWithOptions;

    beforeAll(async () => {
      // $50.00 with a $45.00 promo; "Grande" +$10.00; milk (required, 1) +$8.00;
      // extras (optional, up to 2) +$5.00 / +$3.00.
      latte = (await createProduct(app, owner, categoryId, {
        name: 'Latte',
        priceInCents: 5000,
        promotionalPriceInCents: 4500,
        variants: [
          { name: 'Grande', priceAdjustmentInCents: 1000 },
          { name: 'Descontinuado', priceAdjustmentInCents: 0, active: false },
        ],
        optionGroups: [
          {
            name: 'Leche',
            required: true,
            maxSelections: 1,
            options: [{ name: 'Avena', extraPriceInCents: 800 }],
          },
          {
            name: 'Extras',
            maxSelections: 2,
            options: [
              { name: 'Shot', extraPriceInCents: 500 },
              { name: 'Vainilla', extraPriceInCents: 300 },
              { name: 'Agotado', extraPriceInCents: 100, active: false },
            ],
          },
        ],
      })) as unknown as ProductWithOptions;
    });

    const milk = () => latte.optionGroups[0]!;
    const extras = () => latte.optionGroups[1]!;
    const item = (overrides: Record<string, unknown> = {}) => ({
      productId: latte._id,
      quantity: 1,
      selectedOptionGroups: [
        { optionGroupId: milk()._id, optionIds: [milk().options[0]!._id] },
      ],
      ...overrides,
    });

    it('uses the promo price and adds variant and option prices per unit', async () => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          item({
            quantity: 2,
            selectedVariantId: latte.variants[0]!._id,
            selectedOptionGroups: [
              {
                optionGroupId: milk()._id,
                optionIds: [milk().options[0]!._id],
              },
              {
                optionGroupId: extras()._id,
                optionIds: [extras().options[0]!._id, extras().options[1]!._id],
              },
            ],
          }),
        ]),
      );

      expect(response.status).toBe(201);
      const [line] = response.body.order.items;
      // 4500 promo + 1000 variant + 800 milk + 500 + 300 extras = 7100 per unit
      expect(line.basePriceInCents).toBe(4500);
      expect(line.unitTotalInCents).toBe(7100);
      expect(line.lineTotalInCents).toBe(14200);
      expect(response.body.order.totalInCents).toBe(14200);
      expect(line.selectedVariant.name).toBe('Grande');
      expect(
        line.selectedOptions.map((option: { name: string }) => option.name),
      ).toEqual(['Avena', 'Shot', 'Vainilla']);
    });

    it('rejects a price sent by the client', async () => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [item({ unitTotalInCents: 1 })]),
      );

      expect(response.status).toBe(400);
    });

    it('rejects a missing required option group', async () => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [item({ selectedOptionGroups: [] })]),
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Leche');
    });

    it('rejects more options than the group allows', async () => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          item({
            selectedOptionGroups: [
              {
                optionGroupId: milk()._id,
                optionIds: [milk().options[0]!._id],
              },
              {
                optionGroupId: extras()._id,
                optionIds: extras().options.map((option) => option._id),
              },
            ],
          }),
        ]),
      );

      expect(response.status).toBe(400);
    });

    it('rejects an inactive option', async () => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          item({
            selectedOptionGroups: [
              {
                optionGroupId: milk()._id,
                optionIds: [milk().options[0]!._id],
              },
              {
                optionGroupId: extras()._id,
                optionIds: [extras().options[2]!._id],
              },
            ],
          }),
        ]),
      );

      expect(response.status).toBe(400);
    });

    it('rejects an inactive variant', async () => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          item({ selectedVariantId: latte.variants[1]!._id }),
        ]),
      );

      expect(response.status).toBe(400);
    });

    it('rejects the same option group sent twice', async () => {
      const group = {
        optionGroupId: milk()._id,
        optionIds: [milk().options[0]!._id],
      };

      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          item({ selectedOptionGroups: [group, group] }),
        ]),
      );

      expect(response.status).toBe(400);
    });
  });

  describe('order rules', () => {
    let americanoId: string;

    beforeAll(async () => {
      americanoId = (await createProduct(app, owner, categoryId))._id;
    });

    it('requires the table for dine-in orders', async () => {
      const response = await placeOrder(
        dineInOrder(
          owner.businessId,
          [{ productId: americanoId, quantity: 1 }],
          { serviceReference: undefined },
        ),
      );

      expect(response.status).toBe(400);
    });

    it('requires the customer name by default', async () => {
      const response = await placeOrder(
        dineInOrder(
          owner.businessId,
          [{ productId: americanoId, quantity: 1 }],
          { customerName: '  ' },
        ),
      );

      expect(response.status).toBe(400);
    });

    it('rejects a product that is not available', async () => {
      const product = await createProduct(app, owner, categoryId, {
        available: false,
      });

      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          { productId: product._id, quantity: 1 },
        ]),
      );

      expect(response.status).toBe(400);
    });

    it('rejects a product of another business', async () => {
      const other = await registerBusiness(app);
      const foreign = await createProduct(
        app,
        other,
        await createCategory(app, other),
      );

      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          { productId: foreign._id, quantity: 1 },
        ]),
      );

      expect(response.status).toBe(400);
    });

    it('rejects a quantity above the tracked stock', async () => {
      const product = await createProduct(app, owner, categoryId, {
        trackStock: true,
        stock: 1,
      });

      const tooMany = await placeOrder(
        dineInOrder(owner.businessId, [
          { productId: product._id, quantity: 2 },
        ]),
      );
      const enough = await placeOrder(
        dineInOrder(owner.businessId, [
          { productId: product._id, quantity: 1 },
        ]),
      );

      expect(tooMany.status).toBe(400);
      expect(enough.status).toBe(201);
    });

    // Gap: stock is validated but never decremented (research 2026-10-03-analisis-critico.md §4).
    it.todo('decrements stock atomically when the order is created');

    it('enforces the business minimum order and disabled fulfillment types', async () => {
      const business = await registerBusiness(app, {
        orderSettings: { minimumOrderInCents: 10000, pickupEnabled: false },
      });
      const productId = (
        await createProduct(app, business, await createCategory(app, business))
      )._id;

      const belowMinimum = await placeOrder(
        dineInOrder(business.businessId, [{ productId, quantity: 1 }]),
      );
      const pickup = await placeOrder(
        dineInOrder(business.businessId, [{ productId, quantity: 3 }], {
          fulfillmentType: 'PICKUP',
        }),
      );
      const enough = await placeOrder(
        dineInOrder(business.businessId, [{ productId, quantity: 3 }]),
      );

      expect(belowMinimum.status).toBe(400);
      expect(pickup.status).toBe(400);
      expect(enough.status).toBe(201);
    });

    it('numbers orders consecutively per business', async () => {
      const business = await registerBusiness(app);
      const productId = (
        await createProduct(app, business, await createCategory(app, business))
      )._id;
      const order = () =>
        placeOrder(
          dineInOrder(business.businessId, [{ productId, quantity: 1 }]),
        );

      const first = await order();
      const second = await order();

      expect([
        first.body.order.orderNumber,
        second.body.order.orderNumber,
      ]).toEqual([1, 2]);
    });

    it('returns a WhatsApp link with the order summary', async () => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [
          { productId: americanoId, quantity: 1 },
        ]),
      );

      expect(response.body.whatsappUrl).toMatch(
        /^https:\/\/wa\.me\/5216640000000\?text=/,
      );
      expect(response.body.whatsappMessage).toContain('Americano');
    });
  });

  describe('status transitions', () => {
    let productId: string;

    beforeAll(async () => {
      productId = (await createProduct(app, owner, categoryId))._id;
    });

    const newOrder = async (): Promise<string> => {
      const response = await placeOrder(
        dineInOrder(owner.businessId, [{ productId, quantity: 1 }]),
      );
      return response.body.order._id;
    };
    const move = (orderId: string, status: string) =>
      http(app).patch(`/orders/${orderId}/status`, { status }, owner.token);

    it('follows PENDING → CONFIRMED → PREPARING → READY → COMPLETED and records who changed it', async () => {
      const orderId = await newOrder();

      for (const status of ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']) {
        await move(orderId, status).expect(200);
      }
      const response = await http(app).get(`/orders/${orderId}`, owner.token);

      expect(response.body.status).toBe('COMPLETED');
      expect(
        response.body.statusHistory.map(
          (entry: { status: string }) => entry.status,
        ),
      ).toEqual(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']);
      expect(response.body.statusHistory[1].changedBy).toBe(owner.ownerId);
      expect(response.body.confirmedAt).toEqual(expect.any(String));
      expect(response.body.completedAt).toEqual(expect.any(String));
    });

    it('rejects skipping or going back a step', async () => {
      const orderId = await newOrder();

      const skip = await move(orderId, 'READY');
      await move(orderId, 'CONFIRMED').expect(200);
      const back = await move(orderId, 'PENDING');

      expect(skip.status).toBe(400);
      expect(back.status).toBe(400);
    });

    it('treats CANCELLED as final', async () => {
      const orderId = await newOrder();

      await move(orderId, 'CANCELLED').expect(200);
      const response = await move(orderId, 'CONFIRMED');

      expect(response.status).toBe(400);
    });

    it('rejects an unknown status value', async () => {
      const response = await move(await newOrder(), 'PAID');

      expect(response.status).toBe(400);
    });
  });
});
