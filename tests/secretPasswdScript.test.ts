import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'

const vaultTools = require('../scripts/secret-vault.cjs') as {
  encryptSecrets: (secrets: Record<string, string>, password: string) => unknown
  decryptSecrets: (vault: unknown, password: string) => Record<string, string>
  loadVault: (filePath: string) => unknown
  saveVault: (filePath: string, vault: unknown) => string
}

describe('secrets passwd command', () => {
  it('re-encrypts the vault with a new password and preserves secret values', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yeying-node-passwd-'))
    const vaultPath = path.join(root, 'secrets.enc.json')
    const secrets = {
      ISSUER_PRIVATE_KEY: 'a'.repeat(64),
      NODE_KEY_DERIVATION_SECRET: 'b'.repeat(64),
      DATABASE_USERNAME: 'node_user',
    }

    try {
      vaultTools.saveVault(vaultPath, vaultTools.encryptSecrets(secrets, 'old-password'))
      const output = execFileSync('node', ['scripts/passwd-secret.cjs', '--file', vaultPath], {
        cwd: path.resolve('.'),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          NODE_SECRETS_TEST_INPUTS: JSON.stringify(['old-password', 'new-password', 'new-password']),
        },
        encoding: 'utf8',
      })

      expect(output).toContain('Vault password updated')
      const updatedVault = vaultTools.loadVault(vaultPath)
      expect(() => vaultTools.decryptSecrets(updatedVault, 'old-password')).toThrow()
      expect(vaultTools.decryptSecrets(updatedVault, 'new-password')).toEqual(secrets)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
