import { MigrationInterface, QueryRunner } from 'typeorm'

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export class AddPusherChannelAcls20260909130000 implements MigrationInterface {
  name = 'AddPusherChannelAcls20260909130000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type
    if (dbType !== 'postgres') {
      throw new Error(`AddPusherChannelAcls20260909130000 only supports postgres, got ${dbType}`)
    }
    const schema = (queryRunner.connection.options.schema as string) || 'public'
    const schemaRef = quoteIdent(schema)

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schemaRef}`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schemaRef}."pusher_channel_acls" (
        uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id varchar(64) NOT NULL,
        channel varchar(128) NOT NULL,
        subject varchar(128) NOT NULL,
        subject_type varchar(32) NOT NULL DEFAULT 'account',
        metadata_json text NOT NULL DEFAULT '{}',
        status varchar(32) NOT NULL DEFAULT 'active',
        created_at varchar(64) NOT NULL DEFAULT '',
        updated_at varchar(64) NOT NULL DEFAULT '',
        expires_at varchar(64) NOT NULL DEFAULT ''
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uidx_pusher_channel_acl_subject"
      ON ${schemaRef}."pusher_channel_acls" ("app_id", "channel", "subject")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pusher_channel_acl_app_channel"
      ON ${schemaRef}."pusher_channel_acls" ("app_id", "channel")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_pusher_channel_acl_subject"
      ON ${schemaRef}."pusher_channel_acls" ("subject")
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."idx_project_identity_mapping_wallet"`)
    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."idx_project_identity_mapping_identity"`)
    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."uidx_project_identity_mapping_user"`)
    await queryRunner.query(`DROP TABLE IF EXISTS ${schemaRef}."project_identity_mappings"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type
    if (dbType !== 'postgres') {
      throw new Error(`AddPusherChannelAcls20260909130000 only supports postgres, got ${dbType}`)
    }
    const schema = (queryRunner.connection.options.schema as string) || 'public'
    const schemaRef = quoteIdent(schema)

    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."idx_pusher_channel_acl_subject"`)
    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."idx_pusher_channel_acl_app_channel"`)
    await queryRunner.query(`DROP INDEX IF EXISTS ${schemaRef}."uidx_pusher_channel_acl_subject"`)
    await queryRunner.query(`DROP TABLE IF EXISTS ${schemaRef}."pusher_channel_acls"`)
  }
}
