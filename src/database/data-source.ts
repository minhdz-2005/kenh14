import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { UserFollow } from '../follows/user-follow.entity';
import { Profile } from '../profiles/profile.entity';
import { User } from '../users/user.entity';
import { createDatabaseOptions } from './database-options';

const dataSource = new DataSource({
  ...createDatabaseOptions(process.env),
  entities: [User, Profile, UserFollow, Attachment],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});

export default dataSource;
