import {
  Controller,
  Delete,
  Get,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UserProfilesService } from './user-profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: UserProfilesService) {}

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a user profile' })
  @ApiOkResponse({ description: 'The user profile and follow status' })
  @ApiNotFoundResponse({ description: 'Profile not found' })
  getProfile(
    @Param('username') username: string,
    @CurrentUser() viewer?: AuthenticatedUser,
  ) {
    return this.profiles.getProfile(username, viewer?.id);
  }

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiOkResponse({ description: 'The followed user profile' })
  @ApiNotFoundResponse({ description: 'Profile not found' })
  @ApiUnauthorizedResponse({ description: 'A valid bearer token is required' })
  follow(
    @Param('username') username: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.profiles.follow(viewer.id, username);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiOkResponse({ description: 'The unfollowed user profile' })
  @ApiNotFoundResponse({ description: 'Profile not found' })
  @ApiUnauthorizedResponse({ description: 'A valid bearer token is required' })
  unfollow(
    @Param('username') username: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.profiles.unfollow(viewer.id, username);
  }
}
