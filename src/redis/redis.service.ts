import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async isTokenRevoked(tokenId: string): Promise<boolean> {
    try {
      return (await this.client.exists(this.revocationKey(tokenId))) === 1;
    } catch {
      throw new ServiceUnavailableException(
        'Token revocation store is unavailable',
      );
    }
  }

  async revokeToken(tokenId: string, expiresAt: number): Promise<void> {
    const ttlSeconds = expiresAt - Math.floor(Date.now() / 1000);
    if (ttlSeconds <= 0) return;

    try {
      await this.client.set(this.revocationKey(tokenId), '1', 'EX', ttlSeconds);
    } catch {
      throw new ServiceUnavailableException(
        'Token revocation store is unavailable',
      );
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  private revocationKey(tokenId: string): string {
    return `auth:revoked:${tokenId}`;
  }
}
