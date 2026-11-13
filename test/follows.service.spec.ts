import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FollowsService } from '../src/follows/follows.service';

const profile = {
  id: 'profile-id',
  name: 'Alice',
  bio: null,
  avtUrl: null,
  articleIds: [],
  workAt: null,
  location: null,
};

function createService(target: { id: string; profile: typeof profile } | null) {
  let inserted: unknown;
  let deleted: unknown;
  let ignoredConflicts = false;
  const builder = {
    insert: () => builder,
    into: () => builder,
    values: (value: unknown) => {
      inserted = value;
      return builder;
    },
    orIgnore: () => {
      ignoredConflicts = true;
      return builder;
    },
    execute: async () => undefined,
  };
  const repository = {
    createQueryBuilder: () => builder,
    delete: async (criteria: unknown) => {
      deleted = criteria;
      return { affected: 1 };
    },
    findOneBy: async () => null,
  };
  const users = { findByUsername: async () => target };
  return {
    service: new FollowsService(repository as never, users as never),
    getInserted: () => inserted,
    getDeleted: () => deleted,
    getIgnoredConflicts: () => ignoredConflicts,
  };
}

test('follow inserts the user pair and ignores duplicate follows', async () => {
  const testService = createService({ id: 'target-id', profile });

  assert.equal(await testService.service.follow('follower-id', 'alice'), profile);
  assert.deepEqual(testService.getInserted(), {
    followerId: 'follower-id',
    followingId: 'target-id',
  });
  assert.equal(testService.getIgnoredConflicts(), true);
});

test('follow rejects a missing target and self-follow', async () => {
  const missingTarget = createService(null);
  await assert.rejects(
    missingTarget.service.follow('follower-id', 'missing'),
    (error: unknown) =>
      error instanceof NotFoundException && error.getStatus() === 404,
  );

  const self = createService({ id: 'same-id', profile });
  await assert.rejects(
    self.service.follow('same-id', 'alice'),
    (error: unknown) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );
});

test('unfollow removes the directed relationship', async () => {
  const testService = createService({ id: 'target-id', profile });

  assert.equal(
    await testService.service.unfollow('follower-id', 'alice'),
    profile,
  );
  assert.deepEqual(testService.getDeleted(), {
    followerId: 'follower-id',
    followingId: 'target-id',
  });
});
