import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { UserFollow } from './user-follow.entity';
import { FollowsService } from './follows.service';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([UserFollow])],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
