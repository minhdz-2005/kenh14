import 'dotenv/config';
import type { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app-setup';
import { RedisService } from '../../src/redis/redis.service';

export interface E2ERequestOptions {
  token?: string;
  body?: unknown;
}

export interface E2EResponse {
  status: number;
  body: unknown;
}

export interface E2EContext {
  baseUrl: string;
  dataSource: DataSource;
  request(
    method: string,
    path: string,
    options?: E2ERequestOptions,
  ): Promise<E2EResponse>;
  truncateAll(): Promise<void>;
  close(): Promise<void>;
}

function assertE2EDatabase(): void {
  if (process.env.E2E_DB !== 'true') {
    throw new Error(
      'Refusing to run e2e tests: set E2E_DB=true and point .env at the test database first.',
    );
  }
}

async function startE2EContext(): Promise<E2EContext> {
  assertE2EDatabase();

  const revokedTokenIds = new Set<string>();
  const fakeRedis = {
    isTokenRevoked: async (tokenId: string) => revokedTokenIds.has(tokenId),
    revokeToken: async (tokenId: string, _expiresAt: number) => {
      revokedTokenIds.add(tokenId);
    },
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RedisService)
    .useValue(fakeRedis)
    .compile();
  const app: INestApplication = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  await app.listen(0);

  const { port } = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const dataSource = app.get(DataSource);
  console.log(
    `[e2e] using database "${process.env.DB_NAME}" schema "${process.env.DB_SCHEMA ?? 'public'}"`,
  );

  async function request(
    method: string,
    path: string,
    options: E2ERequestOptions = {},
  ): Promise<E2EResponse> {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (options.token) {
      headers.authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text === '' ? null : JSON.parse(text),
    };
  }

  async function truncateAll(): Promise<void> {
    const schema = process.env.DB_SCHEMA ?? 'public';
    const rows = await dataSource.query<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename <> 'migrations'`,
      [schema],
    );
    if (rows.length === 0) return;
    const tables = rows.map((row) => `"${schema}"."${row.tablename}"`);
    await dataSource.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE`);
  }

  return {
    baseUrl,
    dataSource,
    request,
    truncateAll,
    close: () => app.close(),
  };
}

export default startE2EContext;
