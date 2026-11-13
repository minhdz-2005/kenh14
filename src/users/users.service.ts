import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { Profile } from '../profiles/profile.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(input: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User> {
    return this.users.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const profiles = manager.getRepository(Profile);
      const user = users.create({
        id: randomUUID(),
        email: input.email.trim().toLowerCase(),
        username: input.username.trim(),
        passwordHash: input.passwordHash,
      });
      const savedUser = await users.save(user);
      const profile = profiles.create({
        id: randomUUID(),
        user: savedUser,
        name: savedUser.username,
      });
      await profiles.save(profile);
      savedUser.profile = profile;
      return savedUser;
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id }, relations: { profile: true } });
  }
}
