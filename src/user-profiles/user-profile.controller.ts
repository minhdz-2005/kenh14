import {
  Body,
  Controller,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AVATAR_EXTENSIONS,
  avatarUploadDirectory,
  isSupportedAvatarMimeType,
} from './local-avatar-storage.service';
import { UpdateUserDto } from './update-user.dto';
import { UserProfilesService } from './user-profiles.service';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

@ApiTags('user')
@Controller()
export class UserProfileController {
  constructor(private readonly profiles: UserProfilesService) {}

  @Patch('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ description: 'The updated user profile' })
  @ApiUnauthorizedResponse({ description: 'A valid bearer token is required' })
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateUserDto,
  ) {
    return this.profiles.updateUser(user, body.user);
  }

  @Post('user/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          const directory = avatarUploadDirectory();
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (_request, file, callback) => {
          const extension = AVATAR_EXTENSIONS[file.mimetype] ?? '';
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!isSupportedAvatarMimeType(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG and WebP avatars are accepted',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload a private local avatar for the user' })
  @ApiCreatedResponse({
    description: 'The updated user and private avatar URL',
  })
  @ApiUnauthorizedResponse({ description: 'A valid bearer token is required' })
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.profiles.updateAvatar(user, file);
  }
}
