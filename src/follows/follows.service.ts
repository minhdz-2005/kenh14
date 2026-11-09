import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UserFollow } from '../users/user-follow.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(UserFollow)
    private readonly follows: Repository<UserFollow>,
  ) {}

  async follow(followerId: string, followeeId: string): Promise<void> {
    if (followerId === followeeId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const existing = await this.follows.findOneBy({ followerId, followeeId });
    if (existing) return;

    try {
      await this.follows.save(this.follows.create({ followerId, followeeId }));
    } catch (error) {
      const driverError =
        error instanceof QueryFailedError
          ? (error.driverError as { code?: string })
          : undefined;
      if (driverError?.code !== '23505') throw error;
    }
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await this.follows.delete({ followerId, followeeId });
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    return this.follows.existsBy({ followerId, followeeId });
  }
}
