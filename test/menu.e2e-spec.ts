import type { INestApplication } from '@nestjs/common';
import {
  createCategory,
  createProduct,
  http,
  registerBusiness,
  type RegisteredBusiness,
} from './support/fixtures';
import { closeTestApp, createTestApp } from './support/test-app';

describe('Menu: categories and products (e2e)', () => {
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

  describe('categories', () => {
    it('takes the business from the token, not from the body', async () => {
      const other = await registerBusiness(app);

      const response = await http(app).post(
        '/categories',
        { businessId: other.businessId, name: 'Postres', slug: 'postres' },
        owner.token,
      );

      expect(response.status).toBe(201);
      expect(response.body.businessId).toBe(owner.businessId);
    });

    it('returns 409 for a duplicated slug in the same business', async () => {
      await createCategory(app, owner, { slug: 'bebidas' });

      const response = await http(app).post(
        '/categories',
        { businessId: owner.businessId, name: 'Bebidas 2', slug: 'bebidas' },
        owner.token,
      );

      expect(response.status).toBe(409);
    });

    it('allows the same slug in another business', async () => {
      const other = await registerBusiness(app);
      await createCategory(app, owner, { slug: 'compartido' });

      const response = await http(app).post(
        '/categories',
        {
          businessId: other.businessId,
          name: 'Compartido',
          slug: 'compartido',
        },
        other.token,
      );

      expect(response.status).toBe(201);
    });

    it('hides deleted categories from the public menu', async () => {
      const deletedId = await createCategory(app, owner, { name: 'Temporada' });

      await http(app)
        .delete(`/categories/${deletedId}`, owner.token)
        .expect(200);
      const response = await http(app).get(
        `/categories/business/${owner.businessId}`,
      );

      expect(response.status).toBe(200);
      const ids = response.body.map(
        (category: { _id: string }) => category._id,
      );
      expect(ids).toContain(categoryId);
      expect(ids).not.toContain(deletedId);
    });
  });

  describe('products', () => {
    it('creates a product with variants and option groups', async () => {
      const product = await createProduct(app, owner, categoryId, {
        variants: [{ name: 'Grande', priceAdjustmentInCents: 1000 }],
        optionGroups: [
          {
            name: 'Leche',
            required: true,
            maxSelections: 1,
            options: [{ name: 'Avena', extraPriceInCents: 800 }],
          },
        ],
      });

      expect(product.businessId).toBe(owner.businessId);
      expect(product.variants).toHaveLength(1);
      expect(product.optionGroups).toHaveLength(1);
    });

    it('returns 400 when the promotional price is not lower than the price', async () => {
      const response = await http(app).post(
        '/products',
        {
          businessId: owner.businessId,
          categoryId,
          name: 'Promo mala',
          slug: 'promo-mala',
          priceInCents: 4500,
          promotionalPriceInCents: 4500,
        },
        owner.token,
      );

      expect(response.status).toBe(400);
    });

    it('returns 400 when an option group has more minimum than maximum selections', async () => {
      const response = await http(app).post(
        '/products',
        {
          businessId: owner.businessId,
          categoryId,
          name: 'Grupo malo',
          slug: 'grupo-malo',
          priceInCents: 4500,
          optionGroups: [
            {
              name: 'Extras',
              minSelections: 3,
              maxSelections: 1,
              options: [{ name: 'Uno' }],
            },
          ],
        },
        owner.token,
      );

      expect(response.status).toBe(400);
    });

    it('returns 400 when the category belongs to another business', async () => {
      const other = await registerBusiness(app);
      const foreignCategoryId = await createCategory(app, other);

      const response = await http(app).post(
        '/products',
        {
          businessId: owner.businessId,
          categoryId: foreignCategoryId,
          name: 'Ajeno',
          slug: 'ajeno',
          priceInCents: 100,
        },
        owner.token,
      );

      expect(response.status).toBe(400);
    });

    it('returns 409 for a duplicated product slug in the same business', async () => {
      await createProduct(app, owner, categoryId, { slug: 'latte' });

      const response = await http(app).post(
        '/products',
        {
          businessId: owner.businessId,
          categoryId,
          name: 'Latte 2',
          slug: 'latte',
          priceInCents: 100,
        },
        owner.token,
      );

      expect(response.status).toBe(409);
    });

    it('lists only active and available products in the public menu', async () => {
      const business = await registerBusiness(app);
      const category = await createCategory(app, business);
      const visible = await createProduct(app, business, category, {
        name: 'Visible',
      });
      const soldOut = await createProduct(app, business, category, {
        name: 'Agotado',
      });
      const deleted = await createProduct(app, business, category, {
        name: 'Borrado',
      });

      await http(app)
        .patch(`/products/${soldOut._id}`, { available: false }, business.token)
        .expect(200);
      await http(app)
        .delete(`/products/${deleted._id}`, business.token)
        .expect(200);
      const response = await http(app).get(
        `/products/business/${business.businessId}`,
      );

      expect(
        response.body.map((product: { _id: string }) => product._id),
      ).toEqual([visible._id]);
    });

    it('ignores a businessId sent in the update body', async () => {
      const other = await registerBusiness(app);
      const product = await createProduct(app, owner, categoryId);

      const response = await http(app).patch(
        `/products/${product._id}`,
        { businessId: other.businessId, name: 'Renombrado' },
        owner.token,
      );

      expect(response.status).toBe(200);
      expect(response.body.businessId).toBe(owner.businessId);
      expect(response.body.name).toBe('Renombrado');
    });
  });
});
