import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { UserFollow } from './user-follow.entity';
import { Profile } from '../profiles/profile.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(UserFollow)
    private readonly follows: Repository<UserFollow>,
    private readonly users: UsersService,
  ) {}

  async follow(followerId: string, username: string): Promise<Profile> {
    const target = await this.findTarget(followerId, username);
    await this.follows
      .createQueryBuilder()
      .insert()
      .into(UserFollow)
      .values({ followerId, followingId: target.id })
      .orIgnore()
      .execute();
    return target.profile!;
  }

  async unfollow(followerId: string, username: string): Promise<Profile> {
    const target = await this.findTarget(followerId, username);
    await this.follows.delete({
      followerId,
      followingId: target.id,
    });
    return target.profile!;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.follows.findOneBy({ followerId, followingId });
    return follow !== null;
  }

  private async findTarget(followerId: string, username: string) {
    const target = await this.users.findByUsername(username);
    if (!target?.profile) throw new NotFoundException();
    if (target.id === followerId) {
      throw new BadRequestException('A user cannot follow themselves');
    }
    return target;
  }
}
