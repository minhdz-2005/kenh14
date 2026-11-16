import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { AttachmentsService } from './attachments.service';

@ApiTags('attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=3600')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read a public profile avatar' })
  @ApiNotFoundResponse({ description: 'The attachment does not exist' })
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.attachments.getPublicFile(id);
    return new StreamableFile(createReadStream(file.path), {
      type: file.fileType,
      disposition: 'inline',
      length: file.fileSize,
    });
  }
}
