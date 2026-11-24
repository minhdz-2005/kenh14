import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArticleFavorites1795000000000
  implements MigrationInterface
{
  name = 'CreateArticleFavorites1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.createSchema(schema, true);
    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."article_favorites" (
        "article_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "article_favorites_pkey"
          PRIMARY KEY ("article_id", "user_id"),
        CONSTRAINT "article_favorites_article_id_fkey" FOREIGN KEY ("article_id")
          REFERENCES ${quotedSchema}."articles"("id") ON DELETE CASCADE,
        CONSTRAINT "article_favorites_user_id_fkey" FOREIGN KEY ("user_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "article_favorites_user_id_idx"
      ON ${quotedSchema}."article_favorites" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(
      `DROP TABLE ${quotedSchema}."article_favorites"`,
    );
  }
}
