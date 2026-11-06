import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { QueryFailedError } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from './auth.types';

interface UserCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials extends UserCredentials {
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async register(credentials: RegisterCredentials) {
    if (Buffer.byteLength(credentials.password, 'utf8') > 72) {
      throw new BadRequestException('Password is too long');
    }

    const passwordHash = await hash(credentials.password, 12);
    let user: User;
    try {
      user = await this.users.create({
        email: credentials.email,
        username: credentials.username,
        passwordHash,
      });
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

    return this.toUserResponse(user, await this.issueToken(user));
  }

  async login(credentials: UserCredentials) {
    if (Buffer.byteLength(credentials.password, 'utf8') > 72) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.users.findByEmail(credentials.email);
    if (!user || !(await compare(credentials.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.toUserResponse(user, await this.issueToken(user));
  }

  async getCurrentUser(principal: AuthenticatedUser) {
    const user = await this.users.findById(principal.id);
    if (!user) throw new UnauthorizedException();
    return this.toUserResponse(user, principal.token);
  }

  async logout(principal: AuthenticatedUser): Promise<void> {
    await this.redis.revokeToken(principal.tokenId, principal.expiresAt);
  }

  private issueToken(user: User): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { jwtid: randomUUID() },
    );
  }

  private toUserResponse(user: User, token: string) {
    return {
      user: {
        email: user.email,
        token,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };
  }
}
