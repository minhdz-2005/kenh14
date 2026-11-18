import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { Article } from '../articles/article.entity';
import { UserFollow } from '../follows/user-follow.entity';
import { toAuthorResponse } from '../helpers';
import { UsersService } from '../users/users.service';
import { Comment } from './comment.entity';
import { CreateCommentFieldsDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    @InjectRepository(UserFollow)
    private readonly follows: Repository<UserFollow>,
    private readonly users: UsersService,
  ) {}

  async create(slug: string, userId: string, input: CreateCommentFieldsDto) {
    const article = await this.findArticleBySlug(slug);
    const author = await this.users.findById(userId);
    if (!author) throw new NotFoundException('User not found');

    const id = randomUUID();
    const comment = this.comments.create({
      id,
      body: input.body,
      article: { id: article.id },
      author,
    });

    const savedComment = await this.comments.manager.transaction(
      async (manager) => {
        const saved = await manager.save(comment);
        await manager
          .createQueryBuilder()
          .update(Article)
          .set({ commentIds: () => 'array_append(comment_ids, :commentId)' })
          .where('id = :articleId', { articleId: article.id })
          .setParameter('commentId', id)
          .execute();
        return saved;
      },
    );

    const [response] = await this.buildResponses([savedComment], userId);
    return { comment: response };
  }

  async list(slug: string, viewerId?: string) {
    const article = await this.findArticleBySlug(slug);
    const comments = await this.comments.find({
      where: { article: { id: article.id } },
      relations: { author: { profile: true } },
      order: { createdAt: 'DESC' },
    });
    return { comments: await this.buildResponses(comments, viewerId) };
  }

  async delete(slug: string, commentId: string, userId: string): Promise<void> {
    const article = await this.findArticleBySlug(slug);
    const comment = await this.comments.findOne({
      where: { id: commentId, article: { id: article.id } },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.comments.manager.transaction(async (manager) => {
      await manager.delete(Comment, { id: commentId });
      await manager
        .createQueryBuilder()
        .update(Article)
        .set({ commentIds: () => 'array_remove(comment_ids, :commentId)' })
        .where('id = :articleId', { articleId: article.id })
        .setParameter('commentId', commentId)
        .execute();
    });
  }

  private async findArticleBySlug(slug: string): Promise<Article> {
    const article = await this.articles.findOne({
      where: { slug },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  private async buildResponses(comments: Comment[], viewerId?: string) {
    if (comments.length === 0) return [];

    const authorIds = [...new Set(comments.map((comment) => comment.author.id))];
    const followedAuthors = viewerId
      ? await this.follows.find({
          where: { followerId: viewerId, followingId: In(authorIds) },
          select: { followingId: true },
        })
      : [];
    const followedAuthorIds = new Set(
      followedAuthors.map((follow) => follow.followingId),
    );

    return comments.map((comment) => this.toResponse(comment, followedAuthorIds));
  }

  private toResponse(comment: Comment, followedAuthorIds: Set<string>) {
    return {
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      body: comment.body,
      author: toAuthorResponse(
        comment.author,
        followedAuthorIds.has(comment.author.id),
      ),
    };
  }
}