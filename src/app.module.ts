import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { validateEnvironment } from './config/environment';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    RedisModule,
    UsersModule,
    AuthModule,
    UserProfilesModule,
    I18nModule.forRoot({
      fallbackLanguage: process.env.DEFAULT_LANG ?? 'en',
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
