import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProfileArticleIds1795100000000
  implements MigrationInterface
{
  name = 'RemoveProfileArticleIds1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`
      ALTER TABLE ${quotedSchema}."profiles"
      DROP COLUMN IF EXISTS "article_ids"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`
      ALTER TABLE ${quotedSchema}."profiles"
      ADD COLUMN "article_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[]
    `);
  }
}
