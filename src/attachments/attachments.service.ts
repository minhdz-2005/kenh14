import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { Attachment } from './attachment.entity';

export interface NewAttachment {
  id?: string;
  attachableType: string;
  attachableId: string;
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
  ) {}

  create(input: NewAttachment): Promise<Attachment> {
    return this.attachments.save(
      this.attachments.create({ ...input, id: input.id ?? randomUUID() }),
    );
  }

  findById(id: string): Promise<Attachment | null> {
    return this.attachments.findOneBy({ id });
  }

  findUserAvatar(userId: string, url: string): Promise<Attachment | null> {
    return this.attachments.findOneBy({
      attachableType: 'user',
      attachableId: userId,
      url,
    });
  }

  async delete(id: string): Promise<void> {
    await this.attachments.delete({ id });
  }
}
