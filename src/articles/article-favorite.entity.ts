import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'article_favorites' })
@Index('article_favorites_user_id_idx', ['userId'])
export class ArticleFavorite {
  @PrimaryColumn({ name: 'article_id', type: 'uuid' })
  articleId!: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
