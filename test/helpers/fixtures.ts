import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { slugify } from '../../src/helpers';
import { ArticleFavorite } from '../../src/articles/article-favorite.entity';
import { Article } from '../../src/articles/article.entity';
import { UserFollow } from '../../src/follows/user-follow.entity';
import { Profile } from '../../src/profiles/profile.entity';
import { User } from '../../src/users/user.entity';

export const E2E_PASSWORD = 'Password123!';

let cachedPasswordHash: Promise<string> | undefined;

function passwordHash(): Promise<string> {
  cachedPasswordHash ??= hash(E2E_PASSWORD, 10);
  return cachedPasswordHash;
}

export interface SeededUser {
  user: User;
  token: string;
}

export function signToken(user: User): string {
  if (typeof process.env.JWT_SECRET !== 'string' || !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to sign e2e tokens');
  }
  const jwt = new JwtService({
    secret: process.env.JWT_SECRET,
    signOptions: {
      algorithm: 'HS256' as const,
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as `${number}s`,
    },
  });
  return jwt.sign({ sub: user.id, email: user.email }, { jwtid: randomUUID() });
}

export async function seedUser(
  dataSource: DataSource,
  input: {
    email?: string;
    username?: string;
    bio?: string;
    avtUrl?: string;
  } = {},
): Promise<SeededUser> {
  const suffix = randomUUID().slice(0, 8);
  const username = input.username ?? `user-${suffix}`;
  const email = input.email ?? `e2e-${suffix}@example.com`;

  const user = await dataSource.getRepository(User).save(
    dataSource.getRepository(User).create({
      id: randomUUID(),
      email,
      username,
      passwordHash: await passwordHash(),
    }),
  );

  const profile = await dataSource.getRepository(Profile).save(
    dataSource.getRepository(Profile).create({
      id: randomUUID(),
      user: { id: user.id },
      name: username,
      bio: input.bio ?? null,
      avtUrl: input.avtUrl ?? null,
    }),
  );
  user.profile = profile;

  return { user, token: signToken(user) };
}

export async function seedArticle(
  dataSource: DataSource,
  author: User,
  input: {
    title?: string;
    description?: string;
    body?: string;
    slug?: string;
  } = {},
): Promise<Article> {
  const title = input.title ?? `E2E article ${randomUUID().slice(0, 8)}`;
  return dataSource.getRepository(Article).save(
    dataSource.getRepository(Article).create({
      id: randomUUID(),
      slug: input.slug ?? slugify(title),
      title,
      description: input.description ?? 'Seeded for e2e tests',
      body: input.body ?? 'Seeded body content for e2e tests',
      author: { id: author.id },
    }),
  );
}

export async function seedFavorite(
  dataSource: DataSource,
  userId: string,
  articleId: string,
): Promise<void> {
  await dataSource.getRepository(ArticleFavorite).insert({ articleId, userId });
}

export async function seedFollow(
  dataSource: DataSource,
  followerId: string,
  followingId: string,
): Promise<void> {
  await dataSource.getRepository(UserFollow).insert({ followerId, followingId });
}
