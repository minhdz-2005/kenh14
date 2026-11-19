import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from '../src/profiles/update-user.dto';
import { UserProfileService } from '../src/profiles/user-profile.service';

test('empty patch returns the current user without opening a transaction', async () => {
  const currentUser = {
    email: 'minh@example.com',
    username: 'minh',
    profile: {
      name: 'Minh',
      bio: 'Existing bio',
      avtUrl: null,
      workAt: null,
      location: null,
    },
  };
  let transactionCalls = 0;
  const dataSource = {
    getRepository: () => ({ findOne: async () => currentUser }),
    transaction: async () => {
      transactionCalls += 1;
      throw new Error('Empty patch must not start a transaction');
    },
  };
  const service = new UserProfileService(dataSource as never, {} as never);
  const input = plainToInstance(UpdateUserDto, {});

  assert.deepEqual(await service.update('user-id', 'token', input), {
    user: {
      email: 'minh@example.com',
      token: 'token',
      username: 'minh',
      bio: 'Existing bio',
      image: null,
      name: 'Minh',
      workAt: null,
      location: null,
    },
  });
  assert.equal(transactionCalls, 0);
});

test('empty profile strings clear existing values through the update transaction', async () => {
  const currentUser = {
    email: 'minh@example.com',
    username: 'minh',
    profile: {
      name: 'Minh',
      bio: 'Existing bio',
      avtUrl: null,
      workAt: 'Existing workplace',
      location: 'Existing location',
    },
  };
  let transactionCalls = 0;
  const repository = {
    findOne: async () => currentUser,
    save: async () => undefined,
  };
  const dataSource = {
    transaction: async (run: (manager: never) => Promise<unknown>) => {
      transactionCalls += 1;
      return run({
        getRepository: () => repository,
      } as never);
    },
  };
  const service = new UserProfileService(dataSource as never, {} as never);
  const input = plainToInstance(UpdateUserDto, {
    bio: '',
    workAt: '',
    location: '',
  });

  assert.deepEqual(await service.update('user-id', 'token', input), {
    user: {
      email: 'minh@example.com',
      token: 'token',
      username: 'minh',
      bio: null,
      image: null,
      name: 'Minh',
      workAt: null,
      location: null,
    },
  });
  assert.equal(transactionCalls, 1);
  assert.equal(currentUser.profile.bio, null);
  assert.equal(currentUser.profile.workAt, null);
  assert.equal(currentUser.profile.location, null);
});
