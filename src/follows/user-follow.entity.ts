import {
  Check,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'user_follows' })
@Check(
  'user_follows_no_self_follow',
  '"follower_id" <> "following_id"',
)
@Index('user_follows_following_id_idx', ['followingId'])
export class UserFollow {
  @PrimaryColumn({ name: 'follower_id', type: 'uuid' })
  followerId!: string;

  @PrimaryColumn({ name: 'following_id', type: 'uuid' })
  followingId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
