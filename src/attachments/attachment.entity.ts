import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  Column,
} from 'typeorm';

@Entity({ name: 'attachments' })
@Index('attachments_owner_idx', ['attachableType', 'attachableId'])
export class Attachment {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'attachable_type', type: 'varchar', length: 50 })
  attachableType!: string;

  @Column({ name: 'attachable_id', type: 'varchar', length: 36 })
  attachableId!: string;

  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 127 })
  fileType!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({ name: 'storage_key', type: 'varchar', length: 255, unique: true })
  storageKey!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
