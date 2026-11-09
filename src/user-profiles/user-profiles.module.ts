import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { FollowsModule } from '../follows/follows.module';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { AttachmentsController } from './attachments.controller';
import { LocalAvatarStorageService } from './local-avatar-storage.service';
import { ProfilesController } from './profiles.controller';
import { UserProfileController } from './user-profile.controller';
import { UserProfilesService } from './user-profiles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Module({
  imports: [
    AuthModule,
    RedisModule,
    UsersModule,
    AttachmentsModule,
    FollowsModule,
  ],
  controllers: [
    UserProfileController,
    ProfilesController,
    AttachmentsController,
  ],
  providers: [
    UserProfilesService,
    LocalAvatarStorageService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class UserProfilesModule {}
