import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';
import { Profile } from '../profiles/profile.entity';
import { Attachment } from './attachment.entity';
import { LocalPrivateStorageService } from './local-private-storage.service';

export interface StoredAvatar {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
}

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachments: Repository<Attachment>,
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
    private readonly storage: LocalPrivateStorageService,
  ) {}

  async storeAvatarFile(file: Express.Multer.File): Promise<StoredAvatar> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Avatar file is empty');
    }

    const detectedType = detectImageType(file.buffer);
    const id = randomUUID();
    const storageKey = `${id}.${detectedType.extension}`;
    const fileName =
      basename(file.originalname)
        .split('')
        .filter((character) => {
          const code = character.charCodeAt(0);
          return code >= 32 && code !== 127;
        })
        .join('')
        .slice(0, 255) || storageKey;
    const stored: StoredAvatar = {
      id,
      url: `/api/attachments/${id}`,
      fileName,
      fileType: detectedType.mimeType,
      fileSize: file.buffer.length,
      storageKey,
    };

    await this.storage.write(storageKey, file.buffer);
    return stored;
  }

  async attachAvatar(
    manager: EntityManager,
    profile: Profile,
    stored: StoredAvatar,
  ): Promise<string | undefined> {
    const attachments = manager.getRepository(Attachment);
    const oldAttachment = profile.avtUrl
      ? await attachments.findOneBy({
          ownerType: 'profile',
          ownerId: profile.id,
          url: profile.avtUrl,
        })
      : null;
    const attachment = attachments.create({
      ...stored,
      ownerType: 'profile',
      ownerId: profile.id,
    });

    await attachments.save(attachment);
    profile.avtUrl = stored.url;
    await manager.getRepository(Profile).save(profile);
    if (oldAttachment) {
      await attachments.delete(oldAttachment.id);
    }
    return oldAttachment?.storageKey;
  }

  async getPrivateFile(
    id: string,
    userId: string,
  ): Promise<{ path: string; fileType: string; fileSize: number }> {
    const attachment = await this.attachments.findOneBy({ id });
    if (!attachment || attachment.ownerType !== 'profile') {
      throw new NotFoundException();
    }

    const ownedProfile = await this.profiles.findOne({
      where: { id: attachment.ownerId, user: { id: userId } },
    });
    if (!ownedProfile) throw new NotFoundException();

    await this.storage.assertReadable(attachment.storageKey);
    return {
      path: this.storage.getPath(attachment.storageKey),
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
    };
  }

  removeStoredFile(storageKey: string): Promise<void> {
    return this.storage.remove(storageKey);
  }
}

function detectImageType(
  buffer: Buffer,
): { mimeType: string; extension: string } {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  throw new BadRequestException('Avatar must be a JPEG, PNG, or WebP image');
}
