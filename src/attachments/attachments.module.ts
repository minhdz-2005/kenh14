import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from '../profiles/profile.entity';
import { Attachment } from './attachment.entity';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { LocalPrivateStorageService } from './local-private-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attachment, Profile])],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, LocalPrivateStorageService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
