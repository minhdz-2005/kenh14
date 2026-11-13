import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { FollowsService } from '../follows/follows.service';
import { Profile } from './profile.entity';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly follows: FollowsService,
  ) {}

  @Get(':username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user profile by username' })
  @ApiOkResponse({ description: 'The requested user profile' })
  @ApiNotFoundResponse({ description: 'The profile does not exist' })
  async getProfile(
    @Param('username') username: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const profile = await this.profiles.findByUsername(username);
    if (!profile) throw new NotFoundException();

    const following = await this.follows.isFollowing(
      currentUser.id,
      profile.userId,
    );
    return { profile: this.toProfileResponse(profile, following) };
  }

  @Post(':username/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiOkResponse({ description: 'The followed profile' })
  @ApiNotFoundResponse({ description: 'The profile does not exist' })
  async follow(
    @Param('username') username: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const profile = await this.follows.follow(currentUser.id, username);
    return {
      profile: this.toProfileResponse(profile, true, username),
    };
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiOkResponse({ description: 'The unfollowed profile' })
  @ApiNotFoundResponse({ description: 'The profile does not exist' })
  async unfollow(
    @Param('username') username: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const profile = await this.follows.unfollow(currentUser.id, username);
    return {
      profile: this.toProfileResponse(profile, false, username),
    };
  }

  private toProfileResponse(
    profile: Profile,
    following: boolean,
    username = profile.user.username,
  ) {
    return {
      username,
      name: profile.name,
      bio: profile.bio,
      image: profile.avtUrl,
      articleIds: profile.articleIds,
      workAt: profile.workAt,
      location: profile.location,
      following,
    };
  }
}
