import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
import { User } from '../users/user.entity';
import { Profile } from './profile.entity';
import { UpdateUserDto } from './update-user.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly attachments: AttachmentsService,
  ) {}

  async update(
    userId: string,
    token: string,
    input: UpdateUserDto = new UpdateUserDto(),
    avatar?: Express.Multer.File,
  ) {
    const hasInput = Object.values(input).some((value) => value !== undefined);
    if (!hasInput && !avatar) {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
        relations: { profile: true },
      });
      if (!user?.profile) throw new NotFoundException();
      return this.toUserResponse(user, user.profile, token);
    }

    const storedAvatar = avatar
      ? await this.attachments.storeAvatarFile(avatar)
      : undefined;

    let updated: {
      user: User;
      profile: Profile;
      oldStorageKey?: string;
    };
    try {
      updated = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const user = await users.findOne({
          where: { id: userId },
          relations: { profile: true },
        });
        if (!user?.profile) throw new NotFoundException();

        if (input.email !== undefined) {
          user.email = input.email.trim().toLowerCase();
        }
        if (input.username !== undefined) {
          user.username = input.username.trim();
        }
        if (input.name !== undefined) user.profile.name = input.name;
        if (input.bio !== undefined) user.profile.bio = input.bio;
        if (input.workAt !== undefined) user.profile.workAt = input.workAt;
        if (input.location !== undefined) {
          user.profile.location = input.location;
        }

        const oldStorageKey = storedAvatar
          ? await this.attachments.attachAvatar(
              manager,
              user.profile,
              storedAvatar,
            )
          : undefined;
        await users.save(user);
        await manager.getRepository(Profile).save(user.profile);
        return { user, profile: user.profile, oldStorageKey };
      });
    } catch (error) {
      if (storedAvatar) {
        try {
          await this.attachments.removeStoredFile(storedAvatar.storageKey);
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'Profile update failed and the uploaded avatar could not be removed',
          );
        }
      }
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email or username already exists');
      }
      throw error;
    }

    if (updated.oldStorageKey) {
      await this.attachments.removeStoredFile(updated.oldStorageKey);
    }
    return this.toUserResponse(updated.user, updated.profile, token);
  }

  private toUserResponse(user: User, profile: Profile, token: string) {
    return {
      user: {
        email: user.email,
        token,
        username: user.username,
        bio: profile.bio,
        image: profile.avtUrl,
        name: profile.name,
        workAt: profile.workAt,
        location: profile.location,
      },
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return (
    driverError.code === '23505' &&
    /email|username/i.test(driverError.constraint ?? '')
  );
}
