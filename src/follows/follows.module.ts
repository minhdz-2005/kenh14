import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsService } from './follows.service';
import { UserFollow } from '../users/user-follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserFollow])],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
