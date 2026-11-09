import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_follows' })
@Index('user_follows_followee_idx', ['followeeId'])
export class UserFollow {
  @PrimaryColumn({ name: 'follower_id', type: 'uuid' })
  followerId!: string;

  @PrimaryColumn({ name: 'followee_id', type: 'uuid' })
  followeeId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
