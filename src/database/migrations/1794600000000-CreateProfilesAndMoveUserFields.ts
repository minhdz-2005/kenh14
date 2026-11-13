import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfilesAndMoveUserFields1794600000000
  implements MigrationInterface
{
  name = 'CreateProfilesAndMoveUserFields1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.createSchema(schema, true);
    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."profiles" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "bio" text,
        "avt_url" text,
        "article_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[],
        "work_at" character varying(150),
        "location" character varying(150),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "profiles_user_id_unique" UNIQUE ("user_id"),
        CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      INSERT INTO ${quotedSchema}."profiles" (
        "id", "user_id", "name", "bio", "avt_url", "article_ids",
        "work_at", "location", "created_at", "updated_at"
      )
      SELECT
        "id", "id", "username", "bio", "image", '{}'::uuid[],
        NULL, NULL, "created_at", "updated_at"
      FROM ${quotedSchema}."users"
    `);
    await queryRunner.query(`
      ALTER TABLE ${quotedSchema}."users"
      DROP COLUMN "bio",
      DROP COLUMN "image"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`
      ALTER TABLE ${quotedSchema}."users"
      ADD COLUMN "bio" text,
      ADD COLUMN "image" text
    `);
    await queryRunner.query(`
      UPDATE ${quotedSchema}."users" AS "user"
      SET "bio" = "profile"."bio", "image" = "profile"."avt_url"
      FROM ${quotedSchema}."profiles" AS "profile"
      WHERE "profile"."user_id" = "user"."id"
    `);
    await queryRunner.query(`DROP TABLE ${quotedSchema}."profiles"`);
  }
}
