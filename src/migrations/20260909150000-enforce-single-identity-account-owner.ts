import { MigrationInterface, QueryRunner } from 'typeorm'

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export class EnforceSingleIdentityAccountOwner20260909150000 implements MigrationInterface {
  name = 'EnforceSingleIdentityAccountOwner20260909150000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') {
      throw new Error('EnforceSingleIdentityAccountOwner20260909150000 only supports postgres')
    }

    const schema = quoteIdent(String(queryRunner.connection.options.schema || 'public'))

    await queryRunner.query(`
      UPDATE ${schema}."identity_account_links"
      SET account_id = lower(account_id)
      WHERE chain_key LIKE 'eip155:%'
        AND account_id ~* '^0x[0-9a-f]{40}$'
        AND account_id <> lower(account_id)
    `)

    await queryRunner.query(`
      DELETE FROM ${schema}."identity_account_links" target
      USING (
        SELECT uid
        FROM (
          SELECT
            uid,
            row_number() OVER (
              PARTITION BY chain_key, account_id
              ORDER BY verified_at DESC, uid DESC
            ) AS row_num
          FROM ${schema}."identity_account_links"
          WHERE status = 'active'
            AND coalesce(revoked_at, '') = ''
        ) ranked
        WHERE row_num > 1
      ) duplicate
      WHERE target.uid = duplicate.uid
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uidx_identity_account_active_account"
      ON ${schema}."identity_account_links" (chain_key, account_id)
      WHERE status = 'active' AND revoked_at = ''
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') return
    const schema = quoteIdent(String(queryRunner.connection.options.schema || 'public'))
    await queryRunner.query(`DROP INDEX IF EXISTS ${schema}."uidx_identity_account_active_account"`)
  }
}
