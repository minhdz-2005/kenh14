import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentsService } from '../src/comments/comments.service';

const author = {
  id: 'author-id',
  username: 'minh',
  profile: { bio: 'Writer', avtUrl: '/avatar' },
};

const otherAuthor = {
  id: 'other-author-id',
  username: 'other',
  profile: { bio: null, avtUrl: null },
};

function createService() {
  const articles = [
    { id: 'article-1', slug: 'first-post' },
    { id: 'article-2', slug: 'second-post' },
  ];
  const storedComments: Record<string, any>[] = [];
  const followRows: { followerId: string; followingId: string }[] = [];

  const comments = {
    create: (value: Record<string, any>) => value,
    save: async (comment: Record<string, any>) => {
      comment.createdAt ??= new Date('2026-01-01T00:00:00.000Z');
      comment.updatedAt = new Date('2026-01-01T00:00:00.000Z');
      storedComments.push(comment);
      return comment;
    },
    find: async (options: { where: { article: { id: string } } }) =>
      storedComments.filter(
        (comment) => comment.article.id === options.where.article.id,
      ),
    findOne: async (options: {
      where: { id: string; article: { id: string } };
    }) =>
      storedComments.find(
        (comment) =>
          comment.id === options.where.id &&
          comment.article.id === options.where.article.id,
      ) ?? null,
    delete: async (criteria: { id: string }) => {
      const index = storedComments.findIndex(
        (comment) => comment.id === criteria.id,
      );
      if (index >= 0) storedComments.splice(index, 1);
      return { affected: index >= 0 ? 1 : 0 };
    },
  };
  const articlesRepository = {
    findOne: async (options: { where: { slug: string } }) =>
      articles.find((article) => article.slug === options.where.slug) ?? null,
  };
  const follows = {
    find: async (options: { where: { followerId: string } }) =>
      followRows.filter((follow) => follow.followerId === options.where.followerId),
  };
  const users = {
    findById: async (id: string) =>
      id === author.id ? author : id === otherAuthor.id ? otherAuthor : null,
  };

  function seedComment(overrides: Record<string, any> = {}) {
    const comment = {
      id: 'comment-1',
      body: 'Nice article!',
      article: { id: 'article-1' },
      author,
      authorId: author.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    };
    storedComments.push(comment);
    return comment;
  }

  return {
    service: new CommentsService(
      comments as never,
      articlesRepository as never,
      follows as never,
      users as never,
    ),
    seedComment,
    getComments: () => storedComments,
    addFollow: (followerId: string, followingId: string) =>
      followRows.push({ followerId, followingId }),
  };
}

test('create stores the comment and returns it with the author', async () => {
  const { service, getComments } = createService();

  const result = await service.create('first-post', 'author-id', {
    body: 'Nice article!',
  });

  assert.equal(result.comment.body, 'Nice article!');
  assert.deepEqual(result.comment.author, {
    username: 'minh',
    bio: 'Writer',
    image: '/avatar',
    following: false,
  });
  assert.equal(getComments().length, 1);
  assert.equal(getComments()[0].article.id, 'article-1');
});

test('create returns 404 for an unknown article slug', async () => {
  const { service } = createService();

  await assert.rejects(
    service.create('missing-post', 'author-id', { body: 'Nice article!' }),
    (error: unknown) =>
      error instanceof NotFoundException && error.getStatus() === 404,
  );
});

test('delete returns 403 when the comment belongs to another user', async () => {
  const { service, seedComment, getComments } = createService();
  const comment = seedComment({
    author: otherAuthor,
    authorId: otherAuthor.id,
  });

  await assert.rejects(
    service.delete('first-post', comment.id, 'author-id'),
    (error: unknown) =>
      error instanceof ForbiddenException && error.getStatus() === 403,
  );
  assert.equal(getComments().length, 1);
});

test('delete returns 404 when the comment belongs to another article', async () => {
  const { service, seedComment } = createService();
  seedComment();

  await assert.rejects(
    service.delete('second-post', 'comment-1', 'author-id'),
    (error: unknown) =>
      error instanceof NotFoundException && error.getStatus() === 404,
  );
});

test('delete removes the comment only for its owner', async () => {
  const { service, seedComment, getComments } = createService();
  const comment = seedComment({ author: otherAuthor, authorId: otherAuthor.id });

  await service.delete('first-post', comment.id, otherAuthor.id);
  assert.equal(getComments().length, 0);
});

test('list returns comments with the following state for the viewer', async () => {
  const { service, seedComment, addFollow } = createService();
  seedComment();
  addFollow('viewer-id', 'author-id');

  const result = await service.list('first-post', 'viewer-id');

  assert.equal(result.comments.length, 1);
  assert.equal(result.comments[0].body, 'Nice article!');
  assert.equal(result.comments[0].author.username, 'minh');
  assert.equal(result.comments[0].author.following, true);
});