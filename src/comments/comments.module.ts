import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/article.entity';
import { AuthModule } from '../auth/auth.module';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/jwt-auth.guard';
import { UserFollow } from '../follows/user-follow.entity';
import { UsersModule } from '../users/users.module';
import { Comment } from './comment.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([Comment, Article, UserFollow]),
  ],
  controllers: [CommentsController],
  providers: [CommentsService, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class CommentsModule {}