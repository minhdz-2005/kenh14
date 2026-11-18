import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { LoginCredentialsDto } from '../src/auth/dto/login-user.dto';
import { RegisterCredentialsDto } from '../src/auth/dto/register-user.dto';
import { validateEnvironment } from '../src/config/environment';
import { createDatabaseOptions } from '../src/database/database-options';
import { RedisService } from '../src/redis/redis.service';

const storedRevocations = new Set<string>();
const testRedis = {
  isTokenRevoked: async (id: string) => storedRevocations.has(id),
  revokeToken: async (id: string, _expiresAt: number) =>
    void storedRevocations.add(id),
};

const testUsers: any = {
  create: async () => {
    const driverError = new Error('duplicate key') as Error & { code: string };
    driverError.code = '23505';
    const error = new Error('duplicate key') as Error & { driverError: Error };
    error.driverError = driverError;
    const { QueryFailedError } = await import('typeorm');
    throw new QueryFailedError('', [], error.driverError);
  },
  findByEmail: async () => null,
  findById: async () => ({
    id: 'user-id',
    email: 'minh@example.com',
    username: 'minh',
    bio: null,
    image: null,
  }),
};

const translations = {
  t: (key: string) =>
    key === 'auth.duplicateUser'
      ? 'Email or username already exists'
      : 'Invalid email or password',
};

const auth = new AuthService(
  testUsers as never,
  new JwtService({ secret: 'test-secret-long-enough-for-a-test-key-123' }),
  testRedis as never,
  translations as never,
);

test('duplicate registration returns 409', async () => {
  await assert.rejects(
    auth.register({
      email: 'minh@example.com',
      username: 'minh',
      password: 'strong-password',
    }),
    (error: { getStatus?: () => number }) => error.getStatus?.() === 409,
  );
});

test('wrong password returns 401 for an existing email', async () => {
  const users = testUsers;
  const original = users.findByEmail;
  users.findByEmail = async () => ({
    id: 'user-id',
    email: 'minh@example.com',
    username: 'minh',
    passwordHash:
      '$2b$12$PCxmhQtOtVsmGBx6H24JEefp9Q/gmheNsibDPw/eBvVfLkak6xfDm',
    bio: null,
    image: null,
  });
  try {
    await assert.rejects(
      auth.login({ email: 'minh@example.com', password: 'wrong-password' }),
      (error: { getStatus?: () => number }) => error.getStatus?.() === 401,
    );
  } finally {
    users.findByEmail = original;
  }
});

test('unknown email also returns 401 after a bcrypt comparison', async () => {
  testUsers.findByEmail = async () => null;
  await assert.rejects(
    auth.login({ email: 'unknown@example.com', password: 'wrong-password' }),
    (error: { getStatus?: () => number }) => error.getStatus?.() === 401,
  );
});

test('email is normalized before validation, and password byte limit is enforced', async () => {
  const registration = plainToInstance(RegisterCredentialsDto, {
    email: '  MINH@EXAMPLE.COM  ',
    username: 'minh',
    password: 'é'.repeat(37),
  });
  assert.equal(registration.email, 'minh@example.com');
  assert.ok((await validate(registration)).some((error) => error.property === 'password'));

  const login = plainToInstance(LoginCredentialsDto, {
    email: '  MINH@EXAMPLE.COM  ',
    password: 'strong-password',
  });
  assert.equal(login.email, 'minh@example.com');
  assert.deepEqual(await validate(login), []);
});

test('JWT lifetime rejects values outside 60 seconds to 24 hours', () => {
  const environment = {
    APP_NAME: 'test',
    DB_HOST: 'localhost',
    DB_USER: 'test',
    DB_PASSWORD: 'test',
    DB_NAME: 'test',
    JWT_SECRET: 'x'.repeat(32),
    REDIS_URL: 'redis://localhost:6379',
  };
  assert.throws(() =>
    validateEnvironment({ ...environment, JWT_EXPIRES_IN: '1s' }),
  );
  assert.throws(() =>
    validateEnvironment({ ...environment, JWT_EXPIRES_IN: '30d' }),
  );
  assert.equal(
    validateEnvironment({ ...environment, JWT_EXPIRES_IN: '24h' })
      .JWT_TTL_SECONDS,
    86400,
  );
});

test('database options require credentials instead of using local defaults', () => {
  assert.throws(() => createDatabaseOptions({}), /DB_HOST/);
});

test('JWT guard rejects a token after the logout flow revokes it', async () => {
  storedRevocations.clear();
  const jwt = new JwtService({
    secret: 'test-secret-long-enough-for-a-test-key-123',
    signOptions: { algorithm: 'HS256', expiresIn: 3600 },
  });
  const token = await jwt.signAsync(
    { sub: 'user-id', email: 'minh@example.com' },
    { jwtid: 'logout-test-token' },
  );
  await auth.logout({
    id: 'user-id',
    email: 'minh@example.com',
    tokenId: 'logout-test-token',
    expiresAt: Math.floor(Date.now() / 1000) + 60,
    token,
  });
  const guard = new JwtAuthGuard(
    jwt,
    testRedis as never,
    translations as never,
  );
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: `Bearer ${token}` } }),
    }),
  } as ExecutionContext;
  await assert.rejects(
    guard.canActivate(context),
    (error: { getStatus?: () => number }) => error.getStatus?.() === 401,
  );
});
