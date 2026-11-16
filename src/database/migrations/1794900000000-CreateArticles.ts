import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArticles1794900000000 implements MigrationInterface {
  name = 'CreateArticles1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.createSchema(schema, true);
    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."articles" (
        "id" uuid NOT NULL,
        "slug" character varying(250) NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" character varying(1000) NOT NULL,
        "body" text NOT NULL,
        "comment_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[],
        "author_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "articles_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "articles_slug_unique" UNIQUE ("slug"),
        CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "articles_author_id_idx"
      ON ${quotedSchema}."articles" ("author_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`DROP TABLE ${quotedSchema}."articles"`);
  }
}
