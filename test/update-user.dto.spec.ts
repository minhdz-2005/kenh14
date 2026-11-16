import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from '../src/profiles/update-user.dto';

test('update user rejects null identity fields and maps empty profile fields to null', async () => {
  const dto = plainToInstance(UpdateUserDto, {
    email: null,
    username: null,
    name: null,
    bio: '',
    workAt: '',
    location: '',
  });

  const errors = await validate(dto);

  assert.deepEqual(
    errors.map((error) => error.property).sort(),
    ['email', 'name', 'username'],
  );
  assert.equal(dto.bio, null);
  assert.equal(dto.workAt, null);
  assert.equal(dto.location, null);
});

test('update user trims fields and maps whitespace profile fields to null', async () => {
  const dto = plainToInstance(UpdateUserDto, {
    email: '  MINH@example.com ',
    username: '  minh ',
    name: '  Minh Nguyen ',
    bio: '   ',
    workAt: '   ',
    location: ' Ho Chi Minh City  ',
  });

  assert.deepEqual(await validate(dto), []);
  assert.equal(dto.email, 'minh@example.com');
  assert.equal(dto.username, 'minh');
  assert.equal(dto.name, 'Minh Nguyen');
  assert.equal(dto.bio, null);
  assert.equal(dto.workAt, null);
  assert.equal(dto.location, 'Ho Chi Minh City');
});
