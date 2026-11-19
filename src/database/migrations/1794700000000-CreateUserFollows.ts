import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserFollows1794700000000 implements MigrationInterface {
  name = 'CreateUserFollows1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.createSchema(schema, true);
    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."user_follows" (
        "follower_id" uuid NOT NULL,
        "following_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id", "following_id"),
        CONSTRAINT "user_follows_no_self_follow"
          CHECK ("follower_id" <> "following_id"),
        CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE,
        CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "user_follows_following_id_idx"
      ON ${quotedSchema}."user_follows" ("following_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`DROP TABLE ${quotedSchema}."user_follows"`);
  }
}
