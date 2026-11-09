import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';

const dbSsl =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_SSL !== 'false' &&
    (process.env.DB_HOST ?? '').includes('supabase.'));
const caCertificatePath = process.env.DB_CA_CERT_PATH;

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'kenh14',
  password: process.env.DB_PASSWORD ?? 'kenh14_local_only',
  database: process.env.DB_NAME ?? 'kenh14',
  schema: process.env.DB_SCHEMA ?? 'public',
  ssl: dbSsl
    ? {
        ...(caCertificatePath
          ? { ca: readFileSync(resolve(caCertificatePath), 'utf8') }
          : {}),
        rejectUnauthorized: true,
      }
    : false,
  entities: [User],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});

export default dataSource;
