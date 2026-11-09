import { BadRequestException, Injectable } from '@nestjs/common';
import type { Express } from 'express';
import { createReadStream } from 'node:fs';
import { access, open, rm } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

export const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function isSupportedAvatarMimeType(mimeType: string): boolean {
  return Object.hasOwn(AVATAR_EXTENSIONS, mimeType);
}

export function avatarUploadDirectory(): string {
  return resolve(process.env.UPLOAD_DIR ?? 'uploads/avatars');
}

@Injectable()
export class LocalAvatarStorageService {
  async prepare(file: Express.Multer.File): Promise<{
    storageKey: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> {
    const expectedExtension = AVATAR_EXTENSIONS[file.mimetype];
    if (!expectedExtension || !file.path) {
      await this.removePath(file.path);
      throw new BadRequestException('Upload a JPEG, PNG or WebP avatar');
    }

    try {
      const handle = await open(file.path, 'r');
      let header: Buffer;
      try {
        header = Buffer.alloc(12);
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        header = header.subarray(0, bytesRead);
      } finally {
        await handle.close();
      }

      const detectedType = this.detectMimeType(header);
      if (
        detectedType !== file.mimetype ||
        extname(file.filename) !== expectedExtension
      ) {
        throw new BadRequestException(
          'Avatar content does not match its file type',
        );
      }

      return {
        storageKey: basename(file.filename),
        fileName: this.safeOriginalName(file.originalname, expectedExtension),
        fileType: detectedType,
        fileSize: file.size,
      };
    } catch (error) {
      await this.removePath(file.path);
      throw error;
    }
  }

  getPath(storageKey: string): string {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(storageKey)) {
      throw new BadRequestException('Invalid attachment storage key');
    }
    return resolve(avatarUploadDirectory(), storageKey);
  }

  createReadStream(storageKey: string) {
    return createReadStream(this.getPath(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await access(this.getPath(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  async remove(storageKey: string): Promise<void> {
    await this.removePath(this.getPath(storageKey));
  }

  private async removePath(filePath?: string): Promise<void> {
    if (filePath) await rm(filePath, { force: true });
  }

  private detectMimeType(header: Buffer): string | undefined {
    if (header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
      return 'image/jpeg';
    }
    if (
      header
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return 'image/png';
    }
    if (
      header.toString('ascii', 0, 4) === 'RIFF' &&
      header.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }
    return undefined;
  }

  private safeOriginalName(originalName: string, extension: string): string {
    const safeName = basename(originalName)
      .replace(/[\\/]/g, '_')
      .split('')
      .map((character) => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127 ? '_' : character;
      })
      .join('')
      .trim();
    if (!safeName) return `avatar${extension}`;
    return safeName.slice(0, 255);
  }
}
