import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { UserFollow } from '../follows/user-follow.entity';
import { slugify, toAuthorResponse } from '../helpers';
import { UsersService } from '../users/users.service';
import { ArticleFavorite } from './article-favorite.entity';
import { Article } from './article.entity';
import { CreateArticleFieldsDto } from './dto/create-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { UpdateArticleFieldsDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    @InjectRepository(ArticleFavorite)
    private readonly favorites: Repository<ArticleFavorite>,
    @InjectRepository(UserFollow)
    private readonly follows: Repository<UserFollow>,
    private readonly users: UsersService,
  ) {}

  async create(authorId: string, input: CreateArticleFieldsDto) {
    const author = await this.users.findById(authorId);
    if (!author) throw new NotFoundException('Author not found');

    const id = randomUUID();
    const article = this.articles.create({
      id,
      slug: `${slugify(input.title)}-${id.slice(0, 8)}`,
      title: input.title,
      description: input.description,
      body: input.body,
      author,
    });

    const savedArticle = await this.articles.save(article);
    const [response] = await this.buildArticleResponses([savedArticle], authorId);
    return { article: response };
  }

  async list(query: ListArticlesQueryDto = {}, viewerId?: string) {
    return this.findArticles(query, viewerId);
  }

  async feed(userId: string, query: ListArticlesQueryDto = {}) {
    return this.findArticles(query, userId, userId);
  }

  private async findArticles(
    query: ListArticlesQueryDto,
    viewerId?: string,
    feedUserId?: string,
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const articlesQuery = this.articles
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('author.profile', 'profile');

    if (query.author) {
      articlesQuery.andWhere('author.username = :author', {
        author: query.author,
      });
    }

    if (query.favorited) {
      const favoritedUser = await this.users.findByUsername(query.favorited);
      if (!favoritedUser) {
        return { articles: [], articlesCount: 0 };
      }
      articlesQuery.innerJoin(
        ArticleFavorite,
        'favorite_filter',
        'favorite_filter.articleId = article.id AND favorite_filter.userId = :favoritedUserId',
        { favoritedUserId: favoritedUser.id },
      );
    }

    if (feedUserId) {
      articlesQuery.andWhere((subQuery) => {
        const followQuery = subQuery
          .subQuery()
          .select('1')
          .from(UserFollow, 'feedFollow')
          .where('"feedFollow"."follower_id" = :feedUserId')
          .andWhere('"feedFollow"."following_id" = "article"."author_id"')
          .getQuery();
        return `EXISTS ${followQuery}`;
      }, { feedUserId });
    }

    const [articles, articlesCount] = await articlesQuery
      .orderBy('article.createdAt', 'DESC')
      .addOrderBy('article.id', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      articles: await this.buildArticleResponses(articles, viewerId),
      articlesCount,
    };
  }

  async findBySlug(slug: string, viewerId?: string) {
    const article = await this.articles.findOne({
      where: { slug },
      relations: { author: { profile: true } },
    });
    if (!article) throw new NotFoundException('Article not found');
    const [response] = await this.buildArticleResponses([article], viewerId);
    return { article: response };
  }

  async favorite(slug: string, userId: string) {
    const article = await this.articles.findOne({
      where: { slug },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('Article not found');

    await this.favorites
      .createQueryBuilder()
      .insert()
      .into(ArticleFavorite)
      .values({ articleId: article.id, userId })
      .orIgnore()
      .execute();

    return this.findBySlug(slug, userId);
  }

  async unfavorite(slug: string, userId: string) {
    const article = await this.articles.findOne({
      where: { slug },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('Article not found');

    await this.favorites.delete({ articleId: article.id, userId });
    return this.findBySlug(slug, userId);
  }

  async update(
    slug: string,
    userId: string,
    input: UpdateArticleFieldsDto | undefined,
  ) {
    const article = await this.findOwnedArticle(slug, userId);
    if (
      !input ||
      Object.values(input).every((value) => value === undefined)
    ) {
      const [response] = await this.buildArticleResponses([article], userId);
      return { article: response };
    }

    if (input.title !== undefined) article.title = input.title;
    if (input.description !== undefined) {
      article.description = input.description;
    }
    if (input.body !== undefined) article.body = input.body;

    const savedArticle = await this.articles.save(article);
    const [response] = await this.buildArticleResponses([savedArticle], userId);
    return { article: response };
  }

  async delete(slug: string, userId: string): Promise<void> {
    const article = await this.findOwnedArticle(slug, userId);
    await this.articles.remove(article);
  }

  private async findOwnedArticle(
    slug: string,
    userId: string,
  ): Promise<Article> {
    const article = await this.articles.findOne({
      where: { slug },
      relations: { author: { profile: true } },
    });
    if (!article) throw new NotFoundException('Article not found');
    if (article.author.id !== userId) {
      throw new ForbiddenException('You can only modify your own articles');
    }
    return article;
  }

  private async buildArticleResponses(articles: Article[], viewerId?: string) {
    if (articles.length === 0) return [];
    const meta = await this.loadArticleMeta(articles, viewerId);
    return this.toResponses(articles, meta);
  }

  private async loadArticleMeta(articles: Article[], viewerId?: string) {
    const articleIds = articles.map((article) => article.id);
    const authorIds = [...new Set(articles.map((article) => article.author.id))];
    const [favoriteStats, followedAuthors] = await Promise.all([
      this.favorites
        .createQueryBuilder('favorite')
        .select('favorite.articleId', 'articleId')
        .addSelect('COUNT(*)', 'favoritesCount')
        .addSelect(
          'MAX(CASE WHEN favorite.userId = :viewerId THEN 1 ELSE 0 END)',
          'favorited',
        )
        .where('favorite.articleId IN (:...articleIds)', { articleIds })
        .groupBy('favorite.articleId')
        .setParameter('viewerId', viewerId ?? null)
        .getRawMany<{
          articleId: string;
          favoritesCount: string;
          favorited: string;
        }>(),
      viewerId
        ? this.follows.find({
            where: { followerId: viewerId, followingId: In(authorIds) },
            select: { followingId: true },
          })
        : Promise.resolve([]),
    ]);

    const statsByArticleId = new Map(
      favoriteStats.map((stats) => [
        stats.articleId,
        {
          favoritesCount: Number(stats.favoritesCount),
          favorited: Number(stats.favorited) > 0,
        },
      ]),
    );
    const followedAuthorIds = new Set(
      followedAuthors.map((follow) => follow.followingId),
    );

    return { statsByArticleId, followedAuthorIds };
  }

  private toResponses(
    articles: Article[],
    meta: {
      statsByArticleId: Map<
        string,
        { favoritesCount: number; favorited: boolean }
      >;
      followedAuthorIds: Set<string>;
    },
  ) {
    return articles.map((article) => {
      const stats = meta.statsByArticleId.get(article.id);
      return {
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        favorited: stats?.favorited ?? false,
        favoritesCount: stats?.favoritesCount ?? 0,
        author: toAuthorResponse(
          article.author,
          meta.followedAuthorIds.has(article.author.id),
        ),
      };
    });
  }
}
