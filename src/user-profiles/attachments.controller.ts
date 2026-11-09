import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LocalAvatarStorageService } from './local-avatar-storage.service';
import { UserProfilesService } from './user-profiles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly profiles: UserProfilesService,
    private readonly storage: LocalAvatarStorageService,
  ) {}

  @Get(':attachmentId')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiBearerAuth()
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOperation({
    summary: 'Read a private avatar file for an authenticated user',
  })
  @ApiNotFoundResponse({ description: 'Attachment not found' })
  @ApiUnauthorizedResponse({ description: 'A valid bearer token is required' })
  async getAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<StreamableFile> {
    const attachment = await this.profiles.getAvatarAttachment(attachmentId);
    if (!(await this.storage.exists(attachment.storageKey))) {
      throw new NotFoundException('Attachment file not found');
    }

    return new StreamableFile(
      this.storage.createReadStream(attachment.storageKey),
      {
        type: attachment.fileType,
        disposition: `inline; filename="${attachment.storageKey}"`,
        length: attachment.fileSize,
      },
    );
  }
}
