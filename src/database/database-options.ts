import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

type Environment = Record<string, unknown>;

function requiredString(environment: Environment, key: string): string {
  const value = environment[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

export function validateDatabaseEnvironment(environment: Environment) {
  const host = requiredString(environment, 'DB_HOST');
  const username = requiredString(environment, 'DB_USER');
  const password = requiredString(environment, 'DB_PASSWORD');
  const database = requiredString(environment, 'DB_NAME');
  const port = Number(environment.DB_PORT ?? 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }
  const sslSetting = environment.DB_SSL;
  const useSsl =
    sslSetting === true ||
    sslSetting === 'true' ||
    (sslSetting !== false &&
      sslSetting !== 'false' &&
      host.includes('supabase.'));

  return {
    host,
    username,
    password,
    database,
    port,
    schema:
      typeof environment.DB_SCHEMA === 'string' && environment.DB_SCHEMA.trim()
        ? environment.DB_SCHEMA.trim()
        : 'public',
    useSsl,
    caCertificatePath:
      typeof environment.DB_CA_CERT_PATH === 'string' &&
      environment.DB_CA_CERT_PATH.trim()
        ? environment.DB_CA_CERT_PATH.trim()
        : undefined,
  };
}

export function createDatabaseOptions(
  environment: Environment,
): Pick<
  PostgresConnectionOptions,
  'type' | 'host' | 'port' | 'username' | 'password' | 'database' | 'schema' | 'ssl' | 'synchronize'
> {
  const database = validateDatabaseEnvironment(environment);
  let ssl: PostgresConnectionOptions['ssl'] = false;
  if (database.useSsl) {
    ssl = database.caCertificatePath
      ? {
          ca: readFileSync(resolve(database.caCertificatePath), 'utf8'),
          rejectUnauthorized: true,
        }
      : { rejectUnauthorized: true };
  }

  return {
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
    schema: database.schema,
    ssl,
    synchronize: false,
  };
}
