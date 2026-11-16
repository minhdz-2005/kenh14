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
      workAt: null,
      location: null,
    }),
  } as never, {
    isFollowing: async () => false,
  } as never);

  assert.deepEqual(
    await controller.getProfile('alice'),
    {
      profile: {
        username: 'alice',
        name: 'Alice',
        bio: 'Backend developer',
        image: '/api/attachments/avatar-id',
        workAt: null,
        location: null,
        following: false,
      },
    },
  );
});

test('Get Profile uses an optional authenticated user for following', async () => {
  const controller = new ProfilesController({
    findByUsername: async () => ({
      user: { username: 'alice', email: 'alice@example.com' },
      userId: 'profile-owner-id',
      name: 'Alice',
      bio: 'Backend developer',
      image: '/api/attachments/avatar-id',
      workAt: null,
      location: null,
    }),
  } as never, {
    isFollowing: async (userId: string, profileId: string) =>
      userId === 'viewer-id' && profileId === 'profile-owner-id',
  } as never);

  const result = await controller.getProfile('alice', {
    id: 'viewer-id',
    email: 'viewer@example.com',
    tokenId: 'token-id',
    expiresAt: 1,
    token: 'access-token',
  });

  assert.equal(result.profile.following, true);
});

test('Get Profile returns 404 when username has no profile', async () => {
  const controller = new ProfilesController({
    findByUsername: async () => null,
  } as never, {
    isFollowing: async () => false,
  } as never);

  await assert.rejects(
    controller.getProfile('missing'),
    (error: unknown) =>
      error instanceof NotFoundException && error.getStatus() === 404,
  );
});
