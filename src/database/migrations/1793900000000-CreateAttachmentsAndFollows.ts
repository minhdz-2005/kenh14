import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttachmentsAndFollows1793900000000 implements MigrationInterface {
  name = 'CreateAttachmentsAndFollows1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.createSchema(schema, true);

    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."user_follows" (
        "follower_id" uuid NOT NULL,
        "followee_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id", "followee_id"),
        CONSTRAINT "user_follows_follower_fk" FOREIGN KEY ("follower_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE,
        CONSTRAINT "user_follows_followee_fk" FOREIGN KEY ("followee_id")
          REFERENCES ${quotedSchema}."users"("id") ON DELETE CASCADE,
        CONSTRAINT "user_follows_not_self" CHECK ("follower_id" <> "followee_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "user_follows_followee_idx" ON ${quotedSchema}."user_follows" ("followee_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."attachments" (
        "id" uuid NOT NULL,
        "attachable_type" character varying(50) NOT NULL,
        "attachable_id" character varying(36) NOT NULL,
        "url" character varying(2048) NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_type" character varying(127) NOT NULL,
        "file_size" integer NOT NULL,
        "storage_key" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "attachments_storage_key_unique" UNIQUE ("storage_key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "attachments_owner_idx" ON ${quotedSchema}."attachments" ("attachable_type", "attachable_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`DROP TABLE ${quotedSchema}."attachments"`);
    await queryRunner.query(`DROP TABLE ${quotedSchema}."user_follows"`);
  }
}
