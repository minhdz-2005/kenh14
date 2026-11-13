import {
  Controller,
  Get,
  NotFoundException,
  Param,
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
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get(':username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user profile by username' })
  @ApiOkResponse({ description: 'The requested user profile' })
  @ApiNotFoundResponse({ description: 'The profile does not exist' })
  async getProfile(@Param('username') username: string) {
    const profile = await this.profiles.findByUsername(username);
    if (!profile) throw new NotFoundException();

    return {
      profile: {
        username: profile.user.username,
        name: profile.name,
        bio: profile.bio,
        image: profile.avtUrl,
        articleIds: profile.articleIds,
        workAt: profile.workAt,
        location: profile.location,
      },
    };
  }
}
