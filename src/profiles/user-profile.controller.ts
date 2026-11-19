import {
  Body,
  Controller,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './update-user.dto';
import { UserProfileService } from './user-profile.service';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

@ApiTags('user')
@Controller()
export class UserProfileController {
  constructor(private readonly userProfile: UserProfileService) {}

  @Patch('user')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_SIZE, fieldSize: 10 * 1024, fields: 6 },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update the current user and avatar' })
  @ApiOkResponse({ description: 'The updated user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: '' },
        username: { type: 'string', example: '' },
        name: { type: 'string', example: '' },
        bio: { type: 'string', example: '' },
        workAt: { type: 'string', example: '' },
        location: { type: 'string', example: '' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.userProfile.update(user.id, user.token, input, avatar);
  }
}
