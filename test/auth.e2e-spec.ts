import type { INestApplication } from '@nestjs/common';
import { Types } from 'mongoose';
import { StaffRole } from '../src/modules/staff-users/enums/staff-role.enum';
import { StaffUsersService } from '../src/modules/staff-users/staff-users.service';
import {
  http,
  OWNER_PASSWORD,
  registerBusiness,
  type RegisteredBusiness,
} from './support/fixtures';
import { closeTestApp, createTestApp, getConnection } from './support/test-app';

describe('Business registration and staff auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('registration', () => {
    it('creates the business and its OWNER and returns a working token', async () => {
      const owner = await registerBusiness(app);

      const response = await http(app).get('/orders/business', owner.token);

      expect(response.status).toBe(200);
      const business = await getConnection(app)
        .collection('businesses')
        .findOne({ _id: new Types.ObjectId(owner.businessId) });
      expect(business?.ownerId?.toString()).toBe(owner.ownerId);
    });

    it('stores the password as a bcrypt hash and never returns it', async () => {
      const response = await http(app).post('/business-registration', {
        business: {
          name: 'Hash',
          slug: 'hash-check',
          whatsappNumber: '5216640000000',
        },
        owner: { name: 'Dueña', username: 'owner', password: OWNER_PASSWORD },
      });

      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
      const staff = await getConnection(app)
        .collection('staff_users')
        .findOne({ _id: new Types.ObjectId(response.body.user.id) });
      expect(staff?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(staff?.passwordHash).not.toContain(OWNER_PASSWORD);
    });

    it('returns 409 when the slug is already taken', async () => {
      const first = await registerBusiness(app);

      const response = await http(app).post('/business-registration', {
        business: {
          name: 'Otro',
          slug: first.slug,
          whatsappNumber: '5216640000000',
        },
        owner: { name: 'Otra', username: 'otra', password: OWNER_PASSWORD },
      });

      expect(response.status).toBe(409);
    });

    it('returns 400 for a password shorter than 8 characters', async () => {
      const response = await http(app).post('/business-registration', {
        business: {
          name: 'Corto',
          slug: 'short-pass',
          whatsappNumber: '5216640000000',
        },
        owner: { name: 'Dueña', username: 'owner', password: 'short' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('staff login', () => {
    let owner: RegisteredBusiness;

    beforeAll(async () => {
      owner = await registerBusiness(app);
    });

    const login = (body: Record<string, unknown>) =>
      http(app).post('/auth/staff/login', body);

    it('logs in with business slug, username and password', async () => {
      const response = await login({
        businessSlug: owner.slug,
        username: owner.username,
        password: OWNER_PASSWORD,
      });

      expect(response.status).toBe(201);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.role).toBe(StaffRole.OWNER);
      expect(response.body.business.slug).toBe(owner.slug);
    });

    it('returns 401 for a wrong password', async () => {
      const response = await login({
        businessSlug: owner.slug,
        username: owner.username,
        password: 'wrong-password',
      });

      expect(response.status).toBe(401);
    });

    it('returns 401 for a username of another business', async () => {
      const other = await registerBusiness(app);
      await app.get(StaffUsersService).create({
        businessId: other.businessId,
        username: 'only-in-other',
        password: OWNER_PASSWORD,
        name: 'Mesero',
        role: StaffRole.EMPLOYEE,
      });

      const response = await login({
        businessSlug: owner.slug,
        username: 'only-in-other',
        password: OWNER_PASSWORD,
      });

      expect(response.status).toBe(401);
    });

    it('returns 401 for a deactivated user', async () => {
      const business = await registerBusiness(app);
      await getConnection(app)
        .collection('staff_users')
        .updateOne(
          { _id: new Types.ObjectId(business.ownerId) },
          { $set: { active: false } },
        );

      const response = await login({
        businessSlug: business.slug,
        username: business.username,
        password: OWNER_PASSWORD,
      });

      expect(response.status).toBe(401);
    });

    // Gap: today an unknown slug answers 404, which reveals which slugs exist
    // (docs/architecture/seguridad.md §3).
    it.todo(
      'answers the same 401 for an unknown business and a wrong password',
    );

    // Gap: tokens are valid for 7 days and the guard doesn't check the database
    // (ADR 0023).
    it.todo('rejects the token of a user deactivated after logging in');
  });

  describe('protected routes', () => {
    it('returns 401 without a token', async () => {
      const response = await http(app).get('/orders/business');

      expect(response.status).toBe(401);
    });

    it('returns 401 with a malformed token', async () => {
      const response = await http(app).get('/orders/business', 'not-a-jwt');

      expect(response.status).toBe(401);
    });

    it('returns 403 when the role is not allowed (EMPLOYEE creating products)', async () => {
      const owner = await registerBusiness(app);
      await app.get(StaffUsersService).create({
        businessId: owner.businessId,
        username: 'mesero',
        password: OWNER_PASSWORD,
        name: 'Mesero',
        role: StaffRole.EMPLOYEE,
      });
      const login = await http(app).post('/auth/staff/login', {
        businessSlug: owner.slug,
        username: 'mesero',
        password: OWNER_PASSWORD,
      });

      const response = await http(app).post(
        '/products',
        {
          businessId: owner.businessId,
          categoryId: owner.businessId,
          name: 'X',
          slug: 'x',
          priceInCents: 1,
        },
        login.body.accessToken,
      );

      expect(response.status).toBe(403);
    });
  });
});
