import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const OWNER_PASSWORD = 'password123';

export type RegisteredBusiness = {
  token: string;
  businessId: string;
  ownerId: string;
  slug: string;
  username: string;
};

type Body = Record<string, unknown>;

export function http(app: INestApplication) {
  const server = app.getHttpServer();
  const withToken = (req: request.Test, token?: string): request.Test =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;

  return {
    get: (path: string, token?: string) =>
      withToken(request(server).get(`/api${path}`), token),
    post: (path: string, body: Body, token?: string) =>
      withToken(request(server).post(`/api${path}`), token).send(body),
    patch: (path: string, body: Body, token?: string) =>
      withToken(request(server).patch(`/api${path}`), token).send(body),
    delete: (path: string, token?: string) =>
      withToken(request(server).delete(`/api${path}`), token),
  };
}

export async function registerBusiness(
  app: INestApplication,
  business: Body = {},
): Promise<RegisteredBusiness> {
  const slug = `cafe-${randomUUID().slice(0, 8)}`;
  const username = 'owner';
  const response = await http(app)
    .post('/business-registration', {
      business: {
        name: 'Café de prueba',
        slug,
        whatsappNumber: '5216640000000',
        ...business,
      },
      owner: { name: 'Dueña', username, password: OWNER_PASSWORD },
    })
    .expect(201);

  return {
    token: response.body.accessToken,
    businessId: response.body.business.id,
    ownerId: response.body.user.id,
    slug,
    username,
  };
}

export async function createCategory(
  app: INestApplication,
  owner: RegisteredBusiness,
  overrides: Body = {},
): Promise<string> {
  const response = await http(app)
    .post(
      '/categories',
      {
        businessId: owner.businessId,
        name: 'Cafés',
        slug: `cafes-${randomUUID().slice(0, 6)}`,
        ...overrides,
      },
      owner.token,
    )
    .expect(201);
  return response.body._id;
}

export async function createProduct(
  app: INestApplication,
  owner: RegisteredBusiness,
  categoryId: string,
  overrides: Body = {},
): Promise<Body & { _id: string }> {
  const response = await http(app)
    .post(
      '/products',
      {
        businessId: owner.businessId,
        categoryId,
        name: 'Americano',
        slug: `americano-${randomUUID().slice(0, 6)}`,
        priceInCents: 4500,
        ...overrides,
      },
      owner.token,
    )
    .expect(201);
  return response.body;
}

export function dineInOrder(
  businessId: string,
  items: Body[],
  overrides: Body = {},
): Body {
  return {
    businessId,
    customerName: 'Luis',
    fulfillmentType: 'DINE_IN',
    serviceReference: '5',
    items,
    ...overrides,
  };
}
