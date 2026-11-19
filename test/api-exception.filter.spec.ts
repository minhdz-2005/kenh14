import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ArgumentsHost,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { plainToInstance } from 'class-transformer';
import { IsEmail, IsString, Length, ValidateNested, validateSync } from 'class-validator';
import {
  ApiExceptionFilter,
  createValidationException,
} from '../src/api-exception.filter';

class UserFieldsDto {
  @IsString()
  @Length(3, 30)
  username!: string;

  @IsEmail()
  email!: string;
}

class RegisterDto {
  @ValidateNested()
  @Type(() => UserFieldsDto)
  user!: UserFieldsDto;
}

function createHost() {
  const captured: { status?: number; body?: unknown } = {};
  const response = {
    status: (code: number) => {
      captured.status = code;
      return response;
    },
    json: (body: unknown) => {
      captured.body = body;
      return response;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, captured };
}

test('validation errors become a 422 envelope keyed by field name', () => {
  const instance = plainToInstance(RegisterDto, {
    user: { username: 'ab', email: 'not-an-email' },
  });
  const exception = createValidationException(validateSync(instance));

  assert.ok(exception instanceof UnprocessableEntityException);
  assert.equal(exception.getStatus(), 422);
  const body = exception.getResponse() as {
    errors: Record<string, string[]>;
  };
  assert.deepEqual(Object.keys(body.errors).sort(), ['email', 'username']);
  assert.equal(body.errors.username.length, 1);
  assert.equal(body.errors.email.length, 1);
});

test('filter passes the validation envelope through untouched', () => {
  const { host, captured } = createHost();
  new ApiExceptionFilter().catch(
    createValidationException(
      validateSync(
        plainToInstance(RegisterDto, { user: { username: 'ok-name', email: 'x' } }),
      ),
    ),
    host,
  );

  assert.equal(captured.status, 422);
  assert.deepEqual(Object.keys((captured.body as { errors: object }).errors), [
    'email',
  ]);
});

test('filter wraps plain HttpException messages into the errors envelope', () => {
  const { host, captured } = createHost();
  new ApiExceptionFilter().catch(
    new NotFoundException('Article not found'),
    host,
  );

  assert.equal(captured.status, 404);
  assert.deepEqual(captured.body, {
    errors: { message: ['Article not found'] },
  });
});

test('unknown errors return 500 without leaking internals', () => {
  const { host, captured } = createHost();
  new ApiExceptionFilter().catch(new Error('secret stack detail'), host);

  assert.equal(captured.status, 500);
  assert.deepEqual(captured.body, {
    errors: { message: ['Internal server error'] },
  });
});