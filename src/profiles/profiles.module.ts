import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FollowsModule } from '../follows/follows.module';
import { Profile } from './profile.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import { User } from '../users/user.entity';

@Module({
  imports: [
    AuthModule,
    AttachmentsModule,
    FollowsModule,
    TypeOrmModule.forFeature([Profile, User]),
  ],
  controllers: [ProfilesController, UserProfileController],
  providers: [ProfilesService, UserProfileService, JwtAuthGuard],
})
export class ProfilesModule {}
