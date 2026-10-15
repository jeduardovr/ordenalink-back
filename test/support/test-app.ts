import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

const LOCAL_MONGO_HOSTS = ['mongo', 'localhost', '127.0.0.1'];

// Points MONGODB_URI at a throwaway database so e2e tests never touch the dev
// data. Refuses to run against anything but the local compose Mongo (e.g. Atlas
// via `make up-atlas`).
function useThrowawayDatabase(): string {
  const uri = new URL(process.env.MONGODB_URI ?? '');

  if (!LOCAL_MONGO_HOSTS.includes(uri.hostname)) {
    throw new Error(
      `e2e tests only run against the local Mongo container, got "${uri.hostname}". Start the stack with \`make up-d\`.`,
    );
  }

  const databaseName = `ordenalink_e2e_${randomUUID().slice(0, 8)}`;
  uri.pathname = `/${databaseName}`;
  process.env.MONGODB_URI = uri.toString();
  return databaseName;
}

export async function createTestApp(): Promise<INestApplication> {
  useThrowawayDatabase();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  // Unique indexes (slugs, usernames) must exist before tests rely on them.
  await Promise.all(
    Object.values(getConnection(app).models).map((model) => model.init()),
  );
  return app;
}

export function getConnection(app: INestApplication): Connection {
  return app.get<Connection>(getConnectionToken());
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  const connection = getConnection(app);
  // Mongoose builds indexes in the background; dropping before they finish
  // lets them recreate the database right after.
  await Promise.all(
    Object.values(connection.models).map((model) => model.init()),
  );
  await connection.dropDatabase();
  await app.close();
}
