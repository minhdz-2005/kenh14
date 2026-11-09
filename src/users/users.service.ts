import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity';

export interface UserProfileUpdate {
  email?: string;
  username?: string;
  bio?: string | null;
  image?: string | null;
  passwordHash?: string;
}

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
    const user = this.users.create({
      id: randomUUID(),
      email: input.email.trim().toLowerCase(),
      username: input.username.trim(),
      passwordHash: input.passwordHash,
      bio: null,
      image: null,
    });
    return this.users.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users.findOneBy({ username });
  }

  async updateProfile(id: string, updates: UserProfileUpdate): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (updates.email !== undefined) {
      user.email = updates.email.trim().toLowerCase();
    }
    if (updates.username !== undefined) {
      user.username = updates.username.trim();
    }
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.image !== undefined) user.image = updates.image;
    if (updates.passwordHash !== undefined) {
      user.passwordHash = updates.passwordHash;
    }

    try {
      return await this.users.save(user);
    } catch (error) {
      const driverError =
        error instanceof QueryFailedError
          ? (error.driverError as { code?: string })
          : undefined;
      if (driverError?.code === '23505') {
        throw new ConflictException(
          'A user with this email or username already exists',
        );
      }
      throw error;
    }
  }
}
