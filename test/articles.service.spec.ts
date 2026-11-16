import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArticlesService } from '../src/articles/articles.service';
import { UpdateArticleFieldsDto } from '../src/articles/dto/update-article.dto';

function createService() {
  const author = { id: 'author-id', username: 'minh' };
  let stored: Record<string, any> | null = null;
  let saveCount = 0;
  const repository = {
    create: (value: Record<string, any>) => value,
    save: async (article: Record<string, any>) => {
      saveCount += 1;
      article.createdAt ??= new Date('2026-01-01T00:00:00.000Z');
      article.updatedAt = new Date('2026-01-01T00:00:00.000Z');
      stored = article;
      return article;
    },
    findOne: async (options: { where: { slug: string } }) =>
      stored?.slug === options.where.slug ? stored : null,
    remove: async () => {
      stored = null;
    },
  };
  const users = {
    findById: async (id: string) => (id === author.id ? author : null),
  };
  return {
    service: new ArticlesService(repository as never, users as never),
    getStored: () => stored,
    getSaveCount: () => saveCount,
  };
}

test('create stores an article with a unique slug and empty comment IDs', async () => {
  const { service, getStored } = createService();
  const result = await service.create('author-id', {
    title: 'Bài viết đầu tiên',
    description: 'Mô tả bài viết',
    body: 'Nội dung bài viết',
  });

  assert.match(result.article.slug, /^bai-viet-dau-tien-[0-9a-f]{8}$/);
  assert.deepEqual(result.article.commentIds, []);
  assert.deepEqual(result.article.author, { username: 'minh' });
  assert.equal(getStored()?.author.id, 'author-id');
});

test('get by slug returns 404 for an unknown article', async () => {
  const { service } = createService();

  await assert.rejects(
    service.findBySlug('missing'),
    (error: unknown) =>
      error instanceof NotFoundException && error.getStatus() === 404,
  );
});

test('update only changes owned article fields and keeps its slug stable', async () => {
  const { service } = createService();
  const created = await service.create('author-id', {
    title: 'First article',
    description: 'Description',
    body: 'Body',
  });

  const updated = await service.update(created.article.slug, 'author-id', {
    title: 'Updated title',
  });

  assert.equal(updated.article.title, 'Updated title');
  assert.equal(updated.article.slug, created.article.slug);
  assert.equal(updated.article.body, 'Body');
});

test('update ignores empty values and rejects modification by another user', async () => {
  const { service, getSaveCount } = createService();
  const created = await service.create('author-id', {
    title: 'First article',
    description: 'Description',
    body: 'Body',
  });
  const savesBeforeEmptyPatch = getSaveCount();
  const emptyInput = plainToInstance(UpdateArticleFieldsDto, {
    title: '',
    description: '   ',
    body: ' ',
  });
  assert.deepEqual(await validate(emptyInput), []);

  const unchanged = await service.update(
    created.article.slug,
    'author-id',
    emptyInput,
  );
  assert.equal(unchanged.article.title, 'First article');
  assert.equal(unchanged.article.description, 'Description');
  assert.equal(unchanged.article.body, 'Body');
  assert.equal(getSaveCount(), savesBeforeEmptyPatch);

  const partialInput = plainToInstance(UpdateArticleFieldsDto, {
    title: ' ',
    description: ' Updated description ',
    body: '',
  });
  assert.deepEqual(await validate(partialInput), []);
  const partiallyUpdated = await service.update(
    created.article.slug,
    'author-id',
    partialInput,
  );
  assert.equal(partiallyUpdated.article.title, 'First article');
  assert.equal(partiallyUpdated.article.description, 'Updated description');
  assert.equal(partiallyUpdated.article.body, 'Body');

  await assert.rejects(
    service.update(created.article.slug, 'other-user', { title: 'No access' }),
    (error: unknown) =>
      error instanceof ForbiddenException && error.getStatus() === 403,
  );
});

test('delete removes an article only for its author', async () => {
  const { service, getStored } = createService();
  const created = await service.create('author-id', {
    title: 'First article',
    description: 'Description',
    body: 'Body',
  });

  await assert.rejects(
    service.delete(created.article.slug, 'other-user'),
    (error: unknown) =>
      error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.ok(getStored());

  await service.delete(created.article.slug, 'author-id');
  assert.equal(getStored(), null);
});
