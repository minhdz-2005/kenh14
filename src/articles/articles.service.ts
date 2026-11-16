import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Article } from './article.entity';
import { CreateArticleFieldsDto } from './dto/create-article.dto';
import { UpdateArticleFieldsDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
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
      commentIds: [],
      author,
    });

    return { article: this.toResponse(await this.articles.save(article)) };
  }

  async findBySlug(slug: string) {
    const article = await this.articles.findOne({
      where: { slug },
      relations: { author: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    return { article: this.toResponse(article) };
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
      return { article: this.toResponse(article) };
    }

    if (input.title !== undefined) article.title = input.title;
    if (input.description !== undefined) {
      article.description = input.description;
    }
    if (input.body !== undefined) article.body = input.body;

    return { article: this.toResponse(await this.articles.save(article)) };
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
      relations: { author: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    if (article.author.id !== userId) {
      throw new ForbiddenException('You can only modify your own articles');
    }
    return article;
  }

  private toResponse(article: Article) {
    return {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      commentIds: article.commentIds,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      author: { username: article.author.username },
    };
  }
}

function slugify(title: string): string {
  const slug = title
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 230)
    .replace(/-+$/g, '');
  return slug || 'article';
}
