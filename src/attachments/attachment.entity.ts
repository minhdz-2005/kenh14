import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'attachments' })
@Index('attachments_owner_idx', ['ownerType', 'ownerId'])
@Index('attachments_storage_key_unique', ['storageKey'], { unique: true })
export class Attachment {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 50 })
  ownerType!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 100 })
  fileType!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({
    name: 'storage_key',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  storageKey!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
