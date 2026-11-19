import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveArticleCommentIds1795300000000
  implements MigrationInterface
{
  name = 'RemoveArticleCommentIds1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`
      ALTER TABLE ${quotedSchema}."articles"
      DROP COLUMN "comment_ids"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`
      ALTER TABLE ${quotedSchema}."articles"
      ADD COLUMN "comment_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[]
    `);
  }
}