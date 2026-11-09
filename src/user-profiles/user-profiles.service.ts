import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { Attachment } from '../attachments/attachment.entity';
import { AttachmentsService } from '../attachments/attachments.service';
import { FollowsService } from '../follows/follows.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { UpdateUserFieldsDto } from './update-user.dto';
import { LocalAvatarStorageService } from './local-avatar-storage.service';

@Injectable()
export class UserProfilesService {
  private readonly logger = new Logger(UserProfilesService.name);

  constructor(
    private readonly users: UsersService,
    private readonly follows: FollowsService,
    private readonly attachments: AttachmentsService,
    private readonly storage: LocalAvatarStorageService,
    private readonly auth: AuthService,
  ) {}

  async updateUser(principal: AuthenticatedUser, input: UpdateUserFieldsDto) {
    const updates: {
      email?: string;
      username?: string;
      bio?: string | null;
      passwordHash?: string;
    } = {};

    if (input.email !== undefined) updates.email = input.email;
    if (input.username !== undefined) updates.username = input.username;
    if (input.bio !== undefined) updates.bio = input.bio;
    if (input.password !== undefined) {
      if (Buffer.byteLength(input.password, 'utf8') > 72) {
        throw new BadRequestException('Password is too long');
      }
      updates.passwordHash = await hash(input.password, 12);
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('Provide at least one field to update');
    }

    await this.users.updateProfile(principal.id, updates);
    return this.auth.getCurrentUser(principal);
  }

  async getProfile(username: string, viewerId?: string) {
    const user = await this.users.findByUsername(username);
    if (!user) throw new NotFoundException('Profile not found');
    return { profile: await this.toProfile(user, viewerId) };
  }

  async follow(viewerId: string, username: string) {
    const target = await this.getUserByUsername(username);
    await this.follows.follow(viewerId, target.id);
    return { profile: await this.toProfile(target, viewerId) };
  }

  async unfollow(viewerId: string, username: string) {
    const target = await this.getUserByUsername(username);
    await this.follows.unfollow(viewerId, target.id);
    return { profile: await this.toProfile(target, viewerId) };
  }

  async updateAvatar(principal: AuthenticatedUser, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Avatar file is required');

    const user = await this.users.findById(principal.id);
    if (!user) {
      await this.storage.remove(file.filename);
      throw new NotFoundException('User not found');
    }

    const oldAvatar = user.image
      ? await this.attachments.findUserAvatar(user.id, user.image)
      : null;
    const prepared = await this.storage.prepare(file);
    const attachmentId = randomUUID();
    const url = `/api/attachments/${attachmentId}`;
    try {
      await this.attachments.create({
        id: attachmentId,
        attachableType: 'user',
        attachableId: user.id,
        url,
        ...prepared,
      });
      await this.users.updateProfile(user.id, { image: url });
    } catch (error) {
      await this.attachments.delete(attachmentId);
      await this.storage.remove(prepared.storageKey);
      throw error;
    }

    if (oldAvatar) {
      try {
        await this.attachments.delete(oldAvatar.id);
        await this.storage.remove(oldAvatar.storageKey);
      } catch (error) {
        this.logger.warn(
          `Could not remove replaced avatar attachment ${oldAvatar.id}: ${String(error)}`,
        );
      }
    }

    return this.auth.getCurrentUser(principal);
  }

  async getAvatarAttachment(id: string): Promise<Attachment> {
    const attachment = await this.attachments.findById(id);
    if (!attachment || attachment.attachableType !== 'user') {
      throw new NotFoundException('Attachment not found');
    }

    const owner = await this.users.findById(attachment.attachableId);
    if (!owner) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  private async getUserByUsername(username: string): Promise<User> {
    const user = await this.users.findByUsername(username);
    if (!user) throw new NotFoundException('Profile not found');
    return user;
  }

  private async toProfile(user: User, viewerId?: string) {
    return {
      username: user.username,
      bio: user.bio,
      image: user.image,
      following: viewerId
        ? await this.follows.isFollowing(viewerId, user.id)
        : false,
    };
  }
}
