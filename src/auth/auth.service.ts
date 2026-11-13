import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from './auth.types';
import {
  BCRYPT_SALT_ROUNDS,
  DUMMY_PASSWORD_HASH,
} from './password.constants';

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
    private readonly i18n: I18nService,
  ) {}

  async register(credentials: RegisterCredentials) {
    const passwordHash = await hash(credentials.password, BCRYPT_SALT_ROUNDS);
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
        throw new ConflictException(this.translate('duplicateUser'));
      }
      throw error;
    }

    return this.toUserResponse(user, await this.issueToken(user));
  }

  async login(credentials: UserCredentials) {
    const user = await this.users.findByEmail(credentials.email);
    const passwordMatches = await compare(
      credentials.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException(this.translate('invalidCredentials'));
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
        bio: user.profile?.bio ?? null,
        image: user.profile?.avtUrl ?? null,
      },
    };
  }

  private translate(key: 'duplicateUser' | 'invalidCredentials'): string {
    return this.i18n.t(`auth.${key}`, {
      lang: I18nContext.current()?.lang,
    });
  }
}
