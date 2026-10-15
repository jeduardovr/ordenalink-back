import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { closeTestApp, createTestApp } from './support/test-app';

describe('HTTP pipeline (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('returns 404 for a business slug that does not exist', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/businesses/does-not-exist',
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 when the staff login body is empty', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({});

    expect(response.status).toBe(400);
  });

  it('rejects properties that are not in the DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/staff/login')
      .send({
        businessSlug: 'cafe-luna',
        username: 'owner',
        password: 'a-valid-password',
        role: 'OWNER',
      });

    expect(response.status).toBe(400);
  });
});
