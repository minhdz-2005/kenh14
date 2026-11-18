import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComments1795200000000 implements MigrationInterface {
  name = 'CreateComments1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.createSchema(schema, true);
    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."comments" (
        "id" uuid NOT NULL,
        "body" text NOT NULL,
        "article_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "comments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "comments_article_id_fkey" FOREIGN KEY ("article_id")
          REFERENCES ${quotedSchema}."articles"("id") ON DELETE CASCADE,
        CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "comments_article_id_idx"
      ON ${quotedSchema}."comments" ("article_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`DROP TABLE ${quotedSchema}."comments"`);
  }
}