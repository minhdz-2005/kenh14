import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        schema: config.get<string>('DB_SCHEMA', 'public'),
        ssl: config.get<boolean>('DB_SSL', false)
          ? {
              ...(config.get<string>('DB_CA_CERT_PATH')
                ? {
                    ca: readFileSync(
                      resolve(config.getOrThrow<string>('DB_CA_CERT_PATH')),
                      'utf8',
                    ),
                  }
                : {}),
              rejectUnauthorized: true,
            }
          : false,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
