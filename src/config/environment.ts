import { validateDatabaseEnvironment } from '../database/database-options';

function requiredString(
  environment: Record<string, unknown>,
  key: string,
): string {
  const value = environment[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseDurationSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(value.trim());
  if (!match) {
    throw new Error('JWT_EXPIRES_IN must be a number followed by s, m, h or d');
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? 's';
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  const multiplier = multipliers[unit];
  const seconds = amount * multiplier;
  if (!Number.isSafeInteger(seconds) || seconds < 60 || seconds > 86400) {
    throw new Error('JWT_EXPIRES_IN must be between 60 seconds and 24 hours');
  }
  return seconds;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  requiredString(environment, 'APP_NAME');
  const database = validateDatabaseEnvironment(environment);
  requiredString(environment, 'JWT_SECRET');
  requiredString(environment, 'REDIS_URL');

  const jwtSecret = environment.JWT_SECRET as string;
  if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes long');
  }

  const port = Number(environment.APP_PORT ?? 3000);
  const databasePort = database.port;
  if (![port, databasePort].every(Number.isInteger)) {
    throw new Error('APP_PORT and DB_PORT must be integers');
  }
  if (port < 1 || port > 65535 || databasePort < 1 || databasePort > 65535) {
    throw new Error('APP_PORT and DB_PORT must be between 1 and 65535');
  }

  const redisUrl = new URL(environment.REDIS_URL as string);
  if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
    throw new Error('REDIS_URL must use the redis:// or rediss:// protocol');
  }

  const expiresIn = String(environment.JWT_EXPIRES_IN ?? '1h');
  const jwtTtlSeconds = parseDurationSeconds(expiresIn);
  return {
    ...environment,
    APP_NAME: environment.APP_NAME,
    DEFAULT_LANG: environment.DEFAULT_LANG ?? 'en',
    DB_PORT: databasePort,
    DB_SCHEMA: environment.DB_SCHEMA ?? 'public',
    DB_SSL: database.useSsl,
    APP_PORT: port,
    JWT_EXPIRES_IN: expiresIn,
    JWT_TTL_SECONDS: jwtTtlSeconds,
  };
}
