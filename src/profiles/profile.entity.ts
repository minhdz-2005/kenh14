import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'profiles' })
@Index('profiles_user_id_unique', ['user'], { unique: true })
export class Profile {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @RelationId((profile: Profile) => profile.user)
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ name: 'avt_url', type: 'text', nullable: true })
  avtUrl!: string | null;

  @Column({
    name: 'article_ids',
    type: 'uuid',
    array: true,
    default: () => "'{}'::uuid[]",
  })
  articleIds!: string[];

  @Column({ name: 'work_at', type: 'varchar', length: 150, nullable: true })
  workAt!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
