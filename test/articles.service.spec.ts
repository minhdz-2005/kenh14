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
import { ListArticlesQueryDto } from '../src/articles/dto/list-articles-query.dto';

function createService() {
  const author = {
    id: 'author-id',
    username: 'minh',
    profile: { bio: 'Writer', avtUrl: '/avatar' },
  };
  let stored: Record<string, any> | null = null;
  let saveCount = 0;
  const favoriteRows: { articleId: string; userId: string }[] = [];
  const followRows: { followerId: string; followingId: string }[] = [];
  const listState = {
    conditions: [] as string[],
    joins: [] as string[],
    limit: 0,
    offset: 0,
  };
  let pendingFavorite: { articleId: string; userId: string } | undefined;

  const statsBuilder = {
    articleIds: [] as string[],
    viewerId: null as string | null,
    select: () => statsBuilder,
    addSelect: () => statsBuilder,
    where: (_condition: string, parameters: { articleIds: string[] }) => {
      statsBuilder.articleIds = parameters.articleIds;
      return statsBuilder;
    },
    groupBy: () => statsBuilder,
    setParameter: (_name: string, value: string | null) => {
      statsBuilder.viewerId = value;
      return statsBuilder;
    },
    getRawMany: async () => {
      const selectedFavorites = favoriteRows.filter((favorite) =>
        statsBuilder.articleIds.includes(favorite.articleId),
      );
      const articleIds = [...new Set(selectedFavorites.map((row) => row.articleId))];
      return articleIds.map((articleId) => {
        const rows = selectedFavorites.filter(
          (favorite) => favorite.articleId === articleId,
        );
        return {
          articleId,
          favoritesCount: String(rows.length),
          favorited: String(
            rows.some((favorite) => favorite.userId === statsBuilder.viewerId)
              ? 1
              : 0,
          ),
        };
      });
    },
  };
  const insertBuilder = {
    insert: () => insertBuilder,
    into: () => insertBuilder,
    values: (value: { articleId: string; userId: string }) => {
      pendingFavorite = value;
      return insertBuilder;
    },
    orIgnore: () => insertBuilder,
    execute: async () => {
      if (
        pendingFavorite &&
        !favoriteRows.some(
          (favorite) =>
            favorite.articleId === pendingFavorite?.articleId &&
            favorite.userId === pendingFavorite?.userId,
        )
      ) {
        favoriteRows.push(pendingFavorite);
      }
    },
  };
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
    createQueryBuilder: () => {
      const subQueryBuilder = {
        subQuery: () => subQueryBuilder,
        select: () => subQueryBuilder,
        from: () => subQueryBuilder,
        where: () => subQueryBuilder,
        andWhere: () => subQueryBuilder,
        getQuery: () =>
          '(SELECT 1 FROM "user_follows" "feedFollow" WHERE "feedFollow"."follower_id" = :feedUserId AND "feedFollow"."following_id" = "article"."author_id")',
      };
      const builder = {
        leftJoinAndSelect: () => builder,
        innerJoin: (
          _entity: unknown,
          _alias: string,
          condition: string,
        ) => {
          listState.joins.push(condition);
          return builder;
        },
        andWhere: (
          condition:
            | string
            | ((query: { subQuery: () => typeof subQueryBuilder }) => string),
        ) => {
          listState.conditions.push(
            typeof condition === 'string'
              ? condition
              : condition({ subQuery: () => subQueryBuilder }),
          );
          return builder;
        },
        orderBy: () => builder,
        addOrderBy: () => builder,
        skip: (offset: number) => {
          listState.offset = offset;
          return builder;
        },
        take: (limit: number) => {
          listState.limit = limit;
          return builder;
        },
        getManyAndCount: async () => [stored ? [stored] : [], stored ? 1 : 0],
      };
      return builder;
    },
    remove: async () => {
      stored = null;
    },
  };
  const favorites = {
    createQueryBuilder: (alias?: string) =>
      alias === 'favorite' ? statsBuilder : insertBuilder,
    delete: async (criteria: { articleId: string; userId: string }) => {
      const index = favoriteRows.findIndex(
        (favorite) =>
          favorite.articleId === criteria.articleId &&
          favorite.userId === criteria.userId,
      );
      if (index >= 0) favoriteRows.splice(index, 1);
      return { affected: index >= 0 ? 1 : 0 };
    },
  };
  const follows = {
    find: async (options: { where: { followerId: string } }) =>
      followRows.filter(
        (follow) => follow.followerId === options.where.followerId,
      ),
  };
  const users = {
    findById: async (id: string) => (id === author.id ? author : null),
    findByUsername: async (username: string) =>
      username === author.username ? author : null,
  };
  return {
    service: new ArticlesService(
      repository as never,
      favorites as never,
      follows as never,
      users as never,
    ),
    getStored: () => stored,
    getSaveCount: () => saveCount,
    addFavorite: (articleId: string, userId: string) =>
      favoriteRows.push({ articleId, userId }),
    addFollow: (followerId: string, followingId: string) =>
      followRows.push({ followerId, followingId }),
    getListState: () => listState,
  };
}

test('create stores an article with a unique slug', async () => {
  const { service, getStored } = createService();
  const result = await service.create('author-id', {
    title: 'Bài viết đầu tiên',
    description: 'Mô tả bài viết',
    body: 'Nội dung bài viết',
  });

  assert.match(result.article.slug, /^bai-viet-dau-tien-[0-9a-f]{8}$/);
  assert.equal(result.article.favorited, false);
  assert.equal(result.article.favoritesCount, 0);
  assert.deepEqual(result.article.author, {
    username: 'minh',
    bio: 'Writer',
    image: '/avatar',
    following: false,
  });
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

test('list paginates and reports favorite and following state', async () => {
  const testService = createService();
  await testService.service.create('author-id', {
    title: 'First article',
    description: 'Description',
    body: 'Body',
  });
  const articleId = testService.getStored()?.id as string;
  testService.addFavorite(articleId, 'viewer-id');
  testService.addFollow('viewer-id', 'author-id');

  const result = await testService.service.list(
    { limit: 1, offset: 2, author: 'minh' },
    'viewer-id',
  );

  assert.equal(result.articlesCount, 1);
  assert.equal(result.articles[0].favorited, true);
  assert.equal(result.articles[0].favoritesCount, 1);
  assert.equal(result.articles[0].author.following, true);
  assert.deepEqual(testService.getListState(), {
    conditions: ['author.username = :author'],
    joins: [],
    limit: 1,
    offset: 2,
  });
});

test('list filters by the username that favorited an article', async () => {
  const testService = createService();

  await testService.service.list({ favorited: 'minh' });

  assert.match(
    testService.getListState().joins[0],
    /favorite_filter\.userId = :favoritedUserId/,
  );
});

test('feed restricts results to authors followed by the current user', async () => {
  const testService = createService();

  await testService.service.feed('viewer-id', { limit: 10 });

  assert.match(testService.getListState().conditions[0], /^EXISTS/);
  assert.equal(testService.getListState().limit, 10);
});

test('favorite and unfavorite are idempotent and return updated counts', async () => {
  const { service } = createService();
  const created = await service.create('author-id', {
    title: 'First article',
    description: 'Description',
    body: 'Body',
  });

  const firstFavorite = await service.favorite(created.article.slug, 'reader-id');
  const repeatedFavorite = await service.favorite(
    created.article.slug,
    'reader-id',
  );
  assert.equal(firstFavorite.article.favorited, true);
  assert.equal(firstFavorite.article.favoritesCount, 1);
  assert.equal(repeatedFavorite.article.favoritesCount, 1);

  const firstUnfavorite = await service.unfavorite(
    created.article.slug,
    'reader-id',
  );
  const repeatedUnfavorite = await service.unfavorite(
    created.article.slug,
    'reader-id',
  );
  assert.equal(firstUnfavorite.article.favorited, false);
  assert.equal(firstUnfavorite.article.favoritesCount, 0);
  assert.equal(repeatedUnfavorite.article.favoritesCount, 0);
});

test('favorite operations return 404 for a missing article', async () => {
  const { service } = createService();

  for (const action of [
    () => service.favorite('missing', 'reader-id'),
    () => service.unfavorite('missing', 'reader-id'),
  ]) {
    await assert.rejects(
      action(),
      (error: unknown) =>
        error instanceof NotFoundException && error.getStatus() === 404,
    );
  }
});

test('article list query validates pagination bounds', async () => {
  const valid = plainToInstance(ListArticlesQueryDto, {
    limit: '100',
    offset: '20',
    author: 'minh',
  });
  assert.deepEqual(await validate(valid), []);
  assert.equal(valid.limit, 100);
  assert.equal(valid.offset, 20);

  const invalid = plainToInstance(ListArticlesQueryDto, {
    limit: '101',
    offset: '-1',
  });
  assert.deepEqual(
    (await validate(invalid)).map((error) => error.property).sort(),
    ['limit', 'offset'],
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
