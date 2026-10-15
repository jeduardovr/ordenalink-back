import type { INestApplication } from '@nestjs/common';
import { StaffRole } from '../src/modules/staff-users/enums/staff-role.enum';
import { StaffUsersService } from '../src/modules/staff-users/staff-users.service';
import { http, OWNER_PASSWORD, registerBusiness } from './support/fixtures';
import { closeTestApp, createTestApp } from './support/test-app';

describe('Businesses (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('returns the public business by slug, case-insensitive', async () => {
    const owner = await registerBusiness(app, { name: 'Café Luna' });

    const response = await http(app).get(
      `/businesses/${owner.slug.toUpperCase()}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Café Luna');
    expect(response.body.orderSettings.currency).toBe('MXN');
  });

  it('lets the OWNER update the business', async () => {
    const owner = await registerBusiness(app);

    const response = await http(app).patch(
      '/businesses/me',
      { name: 'Nuevo nombre' },
      owner.token,
    );

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Nuevo nombre');
  });

  it('returns 403 when an EMPLOYEE tries to update the business', async () => {
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

    const response = await http(app).patch(
      '/businesses/me',
      { name: 'No' },
      login.body.accessToken,
    );

    expect(response.status).toBe(403);
  });

  // Bug: a partial orderSettings replaces the whole subdocument, so the other
  // fields go back to their defaults (e.g. pickupEnabled false → true).
  it.todo(
    'keeps the other orderSettings fields when PATCH /businesses/me sends only one',
  );

  // Gap: the slug can be changed, which breaks every printed QR
  // (research 2026-10-03-analisis-critico.md §6, backlog B20).
  it.todo('rejects changing the slug through PATCH /businesses/me');

  // Gap: the public endpoint returns the whole document, ownerId included
  // (docs/architecture/seguridad.md §2, T7).
  it.todo('returns only public fields from GET /businesses/:slug');
});
