import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import startE2EContext from './e2e-context';
import {
  E2E_PASSWORD,
  seedArticle,
  seedFavorite,
  seedFollow,
  seedUser,
} from './fixtures';

test('smoke: boot, seed, http, revoke, truncate', async () => {
  const context = await startE2EContext();
  try {
    await context.truncateAll();

    const author = await seedUser(context.dataSource, { username: 'smokeauth' });
    const reader = await seedUser(context.dataSource, { username: 'smokeread' });
    const article = await seedArticle(context.dataSource, author.user, {
      title: 'Smoke article title',
    });
    await seedFavorite(context.dataSource, reader.user.id, article.id);
    await seedFollow(context.dataSource, reader.user.id, author.user.id);

    const login = await context.request('POST', '/users/login', {
      body: { user: { email: author.user.email, password: E2E_PASSWORD } },
    });
    assert.equal(login.status, 201); // app hiện trả 201, spec RealWorld là 200

    const badLogin = await context.request('POST', '/users/login', {
      body: { user: { email: author.user.email, password: 'wrong-password' } },
    });
    assert.equal(badLogin.status, 401);

    const list = await context.request('GET', '/articles', { token: reader.token });
    assert.equal(list.status, 200);
    const listed = (list.body as {
      articles: { slug: string; favorited: boolean; author: { following: boolean } }[];
      articlesCount: number;
    });
    assert.equal(listed.articlesCount, 1);
    assert.equal(listed.articles[0].slug, article.slug);
    assert.equal(listed.articles[0].favorited, true);
    assert.equal(listed.articles[0].author.following, true);

    const feed = await context.request('GET', '/articles/feed', { token: reader.token });
    assert.equal(feed.status, 200);
    assert.equal((feed.body as { articlesCount: number }).articlesCount, 1);

    const unauthorized = await context.request('DELETE', `/articles/${article.slug}`);
    assert.equal(unauthorized.status, 401);

    const validation = await context.request('POST', '/articles', {
      token: author.token,
      body: { article: {} },
    });
    assert.equal(validation.status, 422);
    assert.ok((validation.body as { errors: Record<string, string[]> }).errors.title);

    const logout = await context.request('POST', '/users/logout', { token: author.token });
    assert.equal(logout.status, 204);
    const revoked = await context.request('GET', '/user', { token: author.token });
    assert.equal(revoked.status, 401);

    await context.truncateAll();
    const after = await context.request('GET', '/articles');
    assert.equal((after.body as { articlesCount: number }).articlesCount, 0);
    const usersAfter = await context.dataSource.query<{ count: string }[]>(
      `SELECT count(*)::text AS count FROM "${process.env.DB_SCHEMA ?? 'public'}"."users"`,
    );
    assert.equal(usersAfter[0].count, '0');
  } finally {
    await context.close();
  }
});
