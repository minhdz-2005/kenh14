import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from '../src/profiles/update-user.dto';
import { UserProfileService } from '../src/profiles/user-profile.service';

test('empty patch fields return the current user without opening a transaction', async () => {
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
  const input = plainToInstance(UpdateUserDto, {
    email: ' ',
    username: '',
    name: '   ',
    bio: '',
    workAt: ' ',
    location: '',
  });

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
