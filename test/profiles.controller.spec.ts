import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { ProfilesController } from '../src/profiles/profiles.controller';

test('Get Profile returns public profile fields without user credentials', async () => {
  const controller = new ProfilesController({
    findByUsername: async () => ({
      user: { username: 'alice', email: 'alice@example.com' },
      name: 'Alice',
      bio: 'Backend developer',
      avtUrl: '/api/attachments/avatar-id',
      articleIds: [],
      workAt: null,
      location: null,
    }),
  } as never);

  assert.deepEqual(await controller.getProfile('alice'), {
    profile: {
      username: 'alice',
      name: 'Alice',
      bio: 'Backend developer',
      image: '/api/attachments/avatar-id',
      articleIds: [],
      workAt: null,
      location: null,
    },
  });
});

test('Get Profile returns 404 when username has no profile', async () => {
  const controller = new ProfilesController({
    findByUsername: async () => null,
  } as never);

  await assert.rejects(
    controller.getProfile('missing'),
    (error: unknown) =>
      error instanceof NotFoundException && error.getStatus() === 404,
  );
});
