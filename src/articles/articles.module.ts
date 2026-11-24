import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { UserFollow } from '../follows/user-follow.entity';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { ArticleFavorite } from './article-favorite.entity';
import { Article } from './article.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([Article, ArticleFavorite, UserFollow]),
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class ArticlesModule {}
