import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from '../src/profiles/update-user.dto';

test('update user rejects null identity fields but treats empty fields as unchanged', async () => {
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
  assert.equal(dto.bio, undefined);
  assert.equal(dto.workAt, undefined);
  assert.equal(dto.location, undefined);
});

test('update user trims fields and only whitespace bio clears the value', async () => {
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
  assert.equal(dto.workAt, undefined);
  assert.equal(dto.location, 'Ho Chi Minh City');
});
