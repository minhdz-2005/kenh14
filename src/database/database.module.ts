import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './database-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createDatabaseOptions({
          DB_HOST: config.getOrThrow<string>('DB_HOST'),
          DB_PORT: config.get<number>('DB_PORT', 5432),
          DB_USER: config.getOrThrow<string>('DB_USER'),
          DB_PASSWORD: config.getOrThrow<string>('DB_PASSWORD'),
          DB_NAME: config.getOrThrow<string>('DB_NAME'),
          DB_SCHEMA: config.get<string>('DB_SCHEMA', 'public'),
          DB_SSL: config.get<boolean>('DB_SSL', false),
          DB_CA_CERT_PATH: config.get<string>('DB_CA_CERT_PATH'),
        }),
        autoLoadEntities: true,
        migrationsRun: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
