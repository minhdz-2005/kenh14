import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Profile } from '../profiles/profile.entity';
import { Attachment } from './attachment.entity';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { LocalPrivateStorageService } from './local-private-storage.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Attachment, Profile])],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, LocalPrivateStorageService, JwtAuthGuard],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
