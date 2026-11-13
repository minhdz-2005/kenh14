import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { Profile } from '../profiles/profile.entity';
import { User } from '../users/user.entity';
import { createDatabaseOptions } from './database-options';

const dataSource = new DataSource({
  ...createDatabaseOptions(process.env),
  entities: [User, Profile],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});

export default dataSource;
