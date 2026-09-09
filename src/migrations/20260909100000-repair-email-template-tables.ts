import { MigrationInterface, QueryRunner } from 'typeorm'

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export class RepairEmailTemplateTables20260909100000 implements MigrationInterface {
  name = 'RepairEmailTemplateTables20260909100000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type
    if (dbType !== 'postgres') {
      throw new Error(`RepairEmailTemplateTables20260909100000 only supports postgres, got ${dbType}`)
    }
    const schema = (queryRunner.connection.options.schema as string) || 'public'
    const schemaRef = quoteIdent(schema)

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schemaRef}`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}."email_templates" (
        uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id varchar(128) NOT NULL,
        version int NOT NULL DEFAULT 1,
        app_id varchar(128) NOT NULL DEFAULT '',
        category varchar(64) NOT NULL DEFAULT 'transactional',
        event_types_json text NOT NULL DEFAULT '[]',
        subject_json text NOT NULL,
        html_body_json text NOT NULL,
        text_body_json text NOT NULL,
        variables_json text NOT NULL DEFAULT '[]',
        enabled boolean NOT NULL DEFAULT true,
        created_at varchar(64) NOT NULL DEFAULT '',
        updated_at varchar(64) NOT NULL DEFAULT ''
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uidx_email_template_id_version"
      ON ${schemaRef}."email_templates" ("template_id", "version")
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}."notification_preferences" (
        uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subject varchar(128) NOT NULL,
        app_id varchar(128) NOT NULL DEFAULT '',
        event_type varchar(128) NOT NULL DEFAULT '',
        inbox_enabled boolean NOT NULL DEFAULT true,
        email_enabled boolean NOT NULL DEFAULT true,
        digest_mode varchar(32) NOT NULL DEFAULT 'disabled',
        created_at varchar(64) NOT NULL DEFAULT '',
        updated_at varchar(64) NOT NULL DEFAULT ''
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uidx_notification_preference_subject_event"
      ON ${schemaRef}."notification_preferences" ("subject", "app_id", "event_type")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type
    if (dbType !== 'postgres') {
      throw new Error(`RepairEmailTemplateTables20260909100000 only supports postgres, got ${dbType}`)
    }
    const schema = (queryRunner.connection.options.schema as string) || 'public'
    const schemaRef = quoteIdent(schema)

    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."uidx_notification_preference_subject_event"`)
    await queryRunner.query(`DROP TABLE IF EXISTS ${schemaRef}."notification_preferences"`)
    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."uidx_email_template_id_version"`)
    await queryRunner.query(`DROP TABLE IF EXISTS ${schemaRef}."email_templates"`)
  }
}
