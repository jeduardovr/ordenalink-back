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

// Business B's staff must not read or change business A's data. A resource of
// another tenant answers 404 (not 403) so it doesn't reveal that it exists.
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let businessA: RegisteredBusiness;
  let businessB: RegisteredBusiness;
  let categoryA: string;
  let productA: string;
  let orderA: string;

  beforeAll(async () => {
    app = await createTestApp();
    businessA = await registerBusiness(app);
    businessB = await registerBusiness(app);
    categoryA = await createCategory(app, businessA);
    productA = (await createProduct(app, businessA, categoryA))._id;
    const order = await http(app).post(
      '/orders',
      dineInOrder(businessA.businessId, [{ productId: productA, quantity: 1 }]),
    );
    orderA = order.body.order._id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it.each([
    {
      route: 'GET /orders/:id',
      method: 'GET',
      path: () => `/orders/${orderA}`,
    },
    {
      route: 'PATCH /orders/:id/status',
      method: 'PATCH',
      path: () => `/orders/${orderA}/status`,
      body: { status: 'CONFIRMED' },
    },
    {
      route: 'PATCH /products/:id',
      method: 'PATCH',
      path: () => `/products/${productA}`,
      body: { name: 'Hackeado' },
    },
    {
      route: 'DELETE /products/:id',
      method: 'DELETE',
      path: () => `/products/${productA}`,
    },
    {
      route: 'PATCH /categories/:id',
      method: 'PATCH',
      path: () => `/categories/${categoryA}`,
      body: { name: 'Hackeado' },
    },
    {
      route: 'DELETE /categories/:id',
      method: 'DELETE',
      path: () => `/categories/${categoryA}`,
    },
  ])(
    '$route with another business token returns 404',
    async ({ method, path, body }) => {
      const client = http(app);
      const response =
        method === 'GET'
          ? await client.get(path(), businessB.token)
          : method === 'DELETE'
            ? await client.delete(path(), businessB.token)
            : await client.patch(path(), body ?? {}, businessB.token);

      expect(response.status).toBe(404);
    },
  );

  it("lists only the caller's orders", async () => {
    const response = await http(app).get('/orders/business', businessB.token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('leaves business A data untouched after the attempts', async () => {
    const order = await http(app).get(`/orders/${orderA}`, businessA.token);
    const products = await http(app).get(
      `/products/business/${businessA.businessId}`,
    );
    const categories = await http(app).get(
      `/categories/business/${businessA.businessId}`,
    );

    expect(order.body.status).toBe('PENDING');
    expect(
      products.body.map((product: { _id: string; name: string }) => [
        product._id,
        product.name,
      ]),
    ).toEqual([[productA, 'Americano']]);
    expect(
      categories.body.map((category: { _id: string }) => category._id),
    ).toEqual([categoryA]);
  });

  it('cannot move a product into a category of another business', async () => {
    const categoryB = await createCategory(app, businessB);

    const response = await http(app).patch(
      `/products/${productA}`,
      { categoryId: categoryB },
      businessA.token,
    );

    expect(response.status).toBe(400);
  });
});
