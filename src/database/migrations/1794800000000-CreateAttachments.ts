import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttachments1794800000000 implements MigrationInterface {
  name = 'CreateAttachments1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.createSchema(schema, true);
    await queryRunner.query(`
      CREATE TABLE ${quotedSchema}."attachments" (
        "id" uuid NOT NULL,
        "owner_type" character varying(50) NOT NULL,
        "owner_id" uuid NOT NULL,
        "url" text NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_type" character varying(100) NOT NULL,
        "file_size" integer NOT NULL,
        "storage_key" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "attachments_storage_key_unique" UNIQUE ("storage_key")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "attachments_owner_idx"
      ON ${quotedSchema}."attachments" ("owner_type", "owner_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA?.trim() || 'public';
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`DROP TABLE ${quotedSchema}."attachments"`);
  }
}
