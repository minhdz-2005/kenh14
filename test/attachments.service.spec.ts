import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttachmentsService } from '../src/attachments/attachments.service';

function createService(options?: {
  attachment?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
}) {
  let written: { storageKey: string; contents: Buffer } | undefined;
  let readableKey: string | undefined;
  const service = new AttachmentsService(
    {
      findOneBy: async () => options?.attachment ?? null,
    } as never,
    {
      findOne: async () => options?.profile ?? null,
    } as never,
    {
      write: async (storageKey: string, contents: Buffer) => {
        written = { storageKey, contents };
      },
      assertReadable: async (storageKey: string) => {
        readableKey = storageKey;
      },
      getPath: (storageKey: string) => `private/${storageKey}`,
    } as never,
  );
  return {
    service,
    getWritten: () => written,
    getReadableKey: () => readableKey,
  };
}

test('avatar upload detects image content and stores a private attachment URL', async () => {
  const testService = createService();
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const file = {
    buffer,
    originalname: 'avatar.jpg',
    mimetype: 'text/plain',
  } as Express.Multer.File;

  const stored = await testService.service.storeAvatarFile(file);

  assert.equal(stored.fileType, 'image/jpeg');
  assert.equal(stored.fileSize, buffer.length);
  assert.equal(stored.fileName, 'avatar.jpg');
  assert.equal(stored.url, `/api/attachments/${stored.id}`);
  assert.equal(testService.getWritten()?.contents, buffer);
});

test('avatar upload rejects unsupported file content', async () => {
  const testService = createService();
  const file = {
    buffer: Buffer.from('not an image'),
    originalname: 'avatar.txt',
  } as Express.Multer.File;

  await assert.rejects(
    testService.service.storeAvatarFile(file),
    (error: unknown) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.equal(testService.getWritten(), undefined);
});

test('private attachment is inaccessible to a different profile owner', async () => {
  const testService = createService({
    attachment: {
      id: 'attachment-id',
      ownerType: 'profile',
      ownerId: 'profile-id',
      storageKey: 'avatar.jpg',
      fileType: 'image/jpeg',
      fileSize: 4,
    },
    profile: null,
  });

  await assert.rejects(
    testService.service.getPrivateFile('attachment-id', 'another-user'),
    (error: unknown) =>
      error instanceof NotFoundException && error.getStatus() === 404,
  );
  assert.equal(testService.getReadableKey(), undefined);
});

test('private attachment returns a path only after owner authorization', async () => {
  const testService = createService({
    attachment: {
      id: 'attachment-id',
      ownerType: 'profile',
      ownerId: 'profile-id',
      storageKey: 'avatar.jpg',
      fileType: 'image/jpeg',
      fileSize: 4,
    },
    profile: { id: 'profile-id' },
  });

  assert.deepEqual(
    await testService.service.getPrivateFile('attachment-id', 'owner-id'),
    {
      path: 'private/avatar.jpg',
      fileType: 'image/jpeg',
      fileSize: 4,
    },
  );
  assert.equal(testService.getReadableKey(), 'avatar.jpg');
});
