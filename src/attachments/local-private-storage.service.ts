import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { constants } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

@Injectable()
export class LocalPrivateStorageService {
  private readonly directory = resolve(process.cwd(), 'private-uploads');

  async write(storageKey: string, contents: Buffer): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.getPath(storageKey), contents, { flag: 'wx' });
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.getPath(storageKey), { force: true });
  }

  async assertReadable(storageKey: string): Promise<void> {
    try {
      await access(this.getPath(storageKey), constants.R_OK);
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  getPath(storageKey: string): string {
    if (
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
        storageKey,
      )
    ) {
      throw new InternalServerErrorException('Invalid private storage key');
    }
    return join(this.directory, storageKey);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
