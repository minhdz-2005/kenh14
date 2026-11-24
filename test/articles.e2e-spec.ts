import * as assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  E2E_PASSWORD,
  seedArticle,
  seedFavorite,
  seedFollow,
  seedUser,
} from './helpers/fixtures';
import startE2EContext, {
  E2EContext,
  E2EResponse,
} from './helpers/e2e-context';

interface ArticleJson {
  slug: string;
  title: string;
  description: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: { username: string; bio: string | null; image: string | null; following: boolean };
}

interface ListJson {
  articles: ArticleJson[];
  articlesCount: number;
}

interface SingleJson {
  article: ArticleJson;
}

interface ErrorsJson {
  errors: Record<string, string[]>;
}

function slugs(articles: ArticleJson[]): string[] {
  return [...articles.map((article) => article.slug)].sort();
}

function parseArticle(response: E2EResponse): SingleJson {
  return response.body as SingleJson;
}

function parseList(response: E2EResponse): ListJson {
  return response.body as ListJson;
}

function parseErrors(response: E2EResponse): ErrorsJson {
  return response.body as ErrorsJson;
}

const CREATE_FIELDS = {
  title: 'E2E create article',
  description: 'Seeded through HTTP',
  body: 'Full flow body content',
};

describe('ArticlesController e2e', () => {
  let context: E2EContext;

  before(async () => {
    context = await startE2EContext();
  });

  after(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await context.truncateAll();
  });

  test('POST /articles creates an article for the owner', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });

    const created = await context.request('POST', '/articles', {
      token: alice.token,
      body: { article: CREATE_FIELDS },
    });

    assert.equal(created.status, 201);
    const article = parseArticle(created).article;
    assert.equal(article.title, CREATE_FIELDS.title);
    assert.equal(article.description, CREATE_FIELDS.description);
    assert.match(article.slug, /^e2e-create-article-[0-9a-f-]+$/);
    assert.equal(article.favorited, false);
    assert.equal(article.favoritesCount, 0);
    assert.equal(article.author.username, 'alice');
    assert.equal(article.author.following, false);
    assert.equal(typeof article.createdAt, 'string');
    assert.equal(typeof article.updatedAt, 'string');
  });

  test('POST /articles requires authentication', async () => {
    const anonymous = await context.request('POST', '/articles', {
      body: { article: CREATE_FIELDS },
    });
    assert.equal(anonymous.status, 401);
    assert.ok(parseErrors(anonymous).errors.message);
  });

  test('POST /articles rejects missing fields with the validation envelope', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });

    const invalid = await context.request('POST', '/articles', {
      token: alice.token,
      body: { article: {} },
    });

    assert.equal(invalid.status, 422);
    const { errors } = parseErrors(invalid);
    assert.ok(errors.title && errors.description && errors.body);
  });

  test('GET /articles/:slug returns the article with neutral viewer state', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const article = await seedArticle(context.dataSource, alice.user, {
      title: 'Readable article',
    });

    const response = await context.request('GET', `/articles/${article.slug}`);

    assert.equal(response.status, 200);
    const found = parseArticle(response).article;
    assert.equal(found.slug, article.slug);
    assert.equal(found.favorited, false);
    assert.equal(found.author.following, false);
  });

  test('GET /articles/:slug reflects favorite and follow state of the viewer', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const bob = await seedUser(context.dataSource, { username: 'bob' });
    const article = await seedArticle(context.dataSource, alice.user);
    await seedFavorite(context.dataSource, bob.user.id, article.id);
    await seedFollow(context.dataSource, bob.user.id, alice.user.id);

    const response = await context.request('GET', `/articles/${article.slug}`, {
      token: bob.token,
    });

    assert.equal(response.status, 200);
    const found = parseArticle(response).article;
    assert.equal(found.favorited, true);
    assert.equal(found.favoritesCount, 1);
    assert.equal(found.author.following, true);
  });

  test('GET /articles/:slug returns 404 for an unknown slug', async () => {
    const response = await context.request('GET', '/articles/does-not-exist');

    assert.equal(response.status, 404);
    assert.deepEqual(parseErrors(response).errors, {
      message: ['Article not found'],
    });
  });

  test('GET /articles filters by author and favorited', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const carol = await seedUser(context.dataSource, { username: 'carol' });
    const bob = await seedUser(context.dataSource, { username: 'bob' });
    const aliceArticle = await seedArticle(context.dataSource, alice.user);
    const carolArticle = await seedArticle(context.dataSource, carol.user);
    await seedFavorite(context.dataSource, bob.user.id, aliceArticle.id);

    const byAuthor = await context.request('GET', '/articles?author=alice');
    assert.equal(byAuthor.status, 200);
    assert.deepEqual(slugs(parseList(byAuthor).articles), [aliceArticle.slug]);
    assert.equal(parseList(byAuthor).articlesCount, 1);

    const byFavorited = await context.request(
      'GET',
      `/articles?favorited=${bob.user.username}`,
    );
    assert.equal(byFavorited.status, 200);
    assert.deepEqual(slugs(parseList(byFavorited).articles), [aliceArticle.slug]);

    const bothFilters = await context.request(
      'GET',
      `/articles?favorited=${bob.user.username}&author=carol`,
    );
    assert.equal(bothFilters.status, 200);
    assert.equal(parseList(bothFilters).articlesCount, 0);

    const unknownFavorited = await context.request(
      'GET',
      '/articles?favorited=nobody',
    );
    assert.equal(unknownFavorited.status, 200);
    assert.equal(parseList(unknownFavorited).articlesCount, 0);
  });

  test('GET /articles paginates with limit and offset', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    for (let index = 0; index < 3; index += 1) {
      await seedArticle(context.dataSource, alice.user);
    }

    const page = await context.request('GET', '/articles?limit=2&offset=0');
    assert.equal(page.status, 200);
    assert.equal(parseList(page).articles.length, 2);
    assert.equal(parseList(page).articlesCount, 3);
  });

  test('GET /articles rejects invalid pagination with the validation envelope', async () => {
    const response = await context.request('GET', '/articles?limit=0');

    assert.equal(response.status, 422);
    assert.ok(parseErrors(response).errors.limit);
  });

  test('GET /articles rejects a broken bearer token', async () => {
    const response = await context.request('GET', '/articles', {
      token: 'not-a-jwt',
    });

    assert.equal(response.status, 401);
  });

  test('GET /articles/feed only shows followed authors', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const carol = await seedUser(context.dataSource, { username: 'carol' });
    const bob = await seedUser(context.dataSource, { username: 'bob' });
    const followedArticle = await seedArticle(context.dataSource, alice.user);
    await seedArticle(context.dataSource, carol.user);
    await seedFollow(context.dataSource, bob.user.id, alice.user.id);

    const feed = await context.request('GET', '/articles/feed', {
      token: bob.token,
    });

    assert.equal(feed.status, 200);
    assert.deepEqual(slugs(parseList(feed).articles), [followedArticle.slug]);
    assert.equal(parseList(feed).articlesCount, 1);
  });

  test('GET /articles/feed requires authentication', async () => {
    const response = await context.request('GET', '/articles/feed');
    assert.equal(response.status, 401);
  });

  test('POST /articles/:slug/favorite favors once and stays idempotent', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const bob = await seedUser(context.dataSource, { username: 'bob' });
    const article = await seedArticle(context.dataSource, alice.user);

    const first = await context.request(
      'POST',
      `/articles/${article.slug}/favorite`,
      { token: bob.token },
    );
    assert.equal(first.status, 200);
    assert.equal(parseArticle(first).article.favorited, true);
    assert.equal(parseArticle(first).article.favoritesCount, 1);

    const second = await context.request(
      'POST',
      `/articles/${article.slug}/favorite`,
      { token: bob.token },
    );
    assert.equal(second.status, 200);
    assert.equal(parseArticle(second).article.favoritesCount, 1);
  });

  test('POST /articles/:slug/favorite returns 404 for an unknown slug', async () => {
    const bob = await seedUser(context.dataSource, { username: 'bob' });

    const response = await context.request(
      'POST',
      '/articles/does-not-exist/favorite',
      { token: bob.token },
    );

    assert.equal(response.status, 404);
    assert.deepEqual(parseErrors(response).errors, {
      message: ['Article not found'],
    });
  });

  test('DELETE /articles/:slug/favorite unfavorites an article', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const bob = await seedUser(context.dataSource, { username: 'bob' });
    const article = await seedArticle(context.dataSource, alice.user);
    await seedFavorite(context.dataSource, bob.user.id, article.id);

    const unfavorited = await context.request(
      'DELETE',
      `/articles/${article.slug}/favorite`,
      { token: bob.token },
    );

    assert.equal(unfavorited.status, 200);
    assert.equal(parseArticle(unfavorited).article.favorited, false);
    assert.equal(parseArticle(unfavorited).article.favoritesCount, 0);
  });

  test('DELETE /articles/:slug/favorite returns 404 for an unknown slug', async () => {
    const bob = await seedUser(context.dataSource, { username: 'bob' });

    const response = await context.request(
      'DELETE',
      '/articles/does-not-exist/favorite',
      { token: bob.token },
    );

    assert.equal(response.status, 404);
  });

  test('PATCH /articles/:slug updates fields for the owner', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const article = await seedArticle(context.dataSource, alice.user, {
      title: 'Before update',
    });

    const updated = await context.request('PATCH', `/articles/${article.slug}`, {
      token: alice.token,
      body: { title: 'After update' },
    });

    assert.equal(updated.status, 200);
    assert.equal(parseArticle(updated).article.title, 'After update');
  });

  test('PATCH /articles/:slug keeps the article when all fields are blank', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const article = await seedArticle(context.dataSource, alice.user, {
      title: 'Keep me',
    });

    const updated = await context.request('PATCH', `/articles/${article.slug}`, {
      token: alice.token,
      body: { title: '   ' },
    });

    assert.equal(updated.status, 200);
    assert.equal(parseArticle(updated).article.title, 'Keep me');
  });

  test('PATCH /articles/:slug forbids other users and reports unknown slugs', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const bob = await seedUser(context.dataSource, { username: 'bob' });
    const article = await seedArticle(context.dataSource, alice.user);

    const forbidden = await context.request('PATCH', `/articles/${article.slug}`, {
      token: bob.token,
      body: { title: 'Hijacked title' },
    });
    assert.equal(forbidden.status, 403);
    assert.deepEqual(parseErrors(forbidden).errors, {
      message: ['You can only modify your own articles'],
    });

    const missing = await context.request('PATCH', '/articles/does-not-exist', {
      token: alice.token,
      body: { title: 'Nothing here' },
    });
    assert.equal(missing.status, 404);

    const anonymous = await context.request('PATCH', `/articles/${article.slug}`, {
      body: { title: 'No token' },
    });
    assert.equal(anonymous.status, 401);
  });

  test('DELETE /articles/:slug removes the article for the owner', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const article = await seedArticle(context.dataSource, alice.user);

    const deleted = await context.request('DELETE', `/articles/${article.slug}`, {
      token: alice.token,
    });
    assert.equal(deleted.status, 204);
    assert.equal(deleted.body, null);

    const afterDelete = await context.request('GET', `/articles/${article.slug}`);
    assert.equal(afterDelete.status, 404);
  });

  test('DELETE /articles/:slug forbids other users and reports unknown slugs', async () => {
    const alice = await seedUser(context.dataSource, { username: 'alice' });
    const bob = await seedUser(context.dataSource, { username: 'bob' });
    const article = await seedArticle(context.dataSource, alice.user);

    const forbidden = await context.request(
      'DELETE',
      `/articles/${article.slug}`,
      { token: bob.token },
    );
    assert.equal(forbidden.status, 403);

    const missing = await context.request('DELETE', '/articles/does-not-exist', {
      token: alice.token,
    });
    assert.equal(missing.status, 404);

    const anonymous = await context.request(
      'DELETE',
      `/articles/${article.slug}`,
    );
    assert.equal(anonymous.status, 401);

    const stillThere = await context.request('GET', `/articles/${article.slug}`);
    assert.equal(stillThere.status, 200);
  });

  test('login with the seeded password works through the full stack', async () => {
    const { user } = await seedUser(context.dataSource, { username: 'alice' });

    const response = await context.request('POST', '/users/login', {
      body: { user: { email: user.email, password: E2E_PASSWORD } },
    });

    assert.equal(response.status, 201); // app đang trả 201, spec RealWorld là 200
  });
});
