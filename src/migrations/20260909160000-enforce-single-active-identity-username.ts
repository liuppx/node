import { MigrationInterface, QueryRunner } from 'typeorm'

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export class EnforceSingleActiveIdentityUsername20260909160000 implements MigrationInterface {
  name = 'EnforceSingleActiveIdentityUsername20260909160000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') {
      throw new Error('EnforceSingleActiveIdentityUsername20260909160000 only supports postgres')
    }

    const schema = quoteIdent(String(queryRunner.connection.options.schema || 'public'))

    await queryRunner.query(`
      UPDATE ${schema}."identity_usernames" target
      SET status = 'replaced', reserved_until = '', updated_at = current_timestamp::text
      FROM (
        SELECT uid
        FROM (
          SELECT
            uid,
            row_number() OVER (
              PARTITION BY namespace, identity_did
              ORDER BY updated_at DESC, created_at DESC, uid DESC
            ) AS row_num
          FROM ${schema}."identity_usernames"
          WHERE status = 'active'
        ) ranked
        WHERE row_num > 1
      ) duplicate
      WHERE target.uid = duplicate.uid
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uidx_identity_username_active_identity"
      ON ${schema}."identity_usernames" (namespace, identity_did)
      WHERE status = 'active'
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') return
    const schema = quoteIdent(String(queryRunner.connection.options.schema || 'public'))
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}."uidx_identity_username_active_identity"`)
  }
}
