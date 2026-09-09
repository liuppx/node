import { Wallet } from 'ethers'
import { generateKeyPairSync, sign } from 'node:crypto'
import { vi } from 'vitest'
import { SingletonDataSource } from '../src/domain/facade/datasource'
import { IdentityCredentialDO, IdentityUsernameDO } from '../src/domain/mapper/entity'
import { createInMemoryDataSource } from './helpers/inMemoryDataSource'

vi.mock('../src/config/runtime', () => ({ getConfig: (key: string) => key === 'issuer.identity.usernameNamespace' ? 'node.yeying.pub' : undefined }))
vi.mock('../src/auth/identityIssuer', () => ({
  issueIdentityCredential: (input: any) => {
    const now = Math.floor(Date.now() / 1000)
    return `header.${Buffer.from(JSON.stringify({ iat: now, exp: now + 7 * 86400, sub: input.subject })).toString('base64url')}.signature`
  }
}))
SingletonDataSource.set(createInMemoryDataSource())

process.env.IDENTITY_ISSUER_DID = 'did:web:node.example'
process.env.IDENTITY_ISSUER_PRIVATE_KEY = '22'.repeat(32)
process.env.IDENTITY_ISSUER_KEY_ID = 'issuer-v1'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const identity = 'did:yeying:wid_1234567890123456789012'
const accountIdentityDocument = {
  version: 1, id: identity, walletIdentityId: 'wid_1234567890123456789012', createdAt: '2026-08-13T00:00:00.000Z', updatedAt: '2026-08-13T00:00:00.000Z', revision: 1,
  controllers: [{ controllerId: 'controller-1', kind: 'wallet_key', publicKey: (publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32).toString('base64url'), algorithm: 'Ed25519', purposes: ['authentication', 'assertion', 'manage'], status: 'active' }], accounts: [], issuers: [], recovery: { version: 1, manageThreshold: 1, controllerChangeDelaySeconds: 86400 }
}
function canonicalize(value: any): string {
  if (value === null) return 'null'; if (typeof value !== 'object') return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`; return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
}
const document = { ...accountIdentityDocument, proof: { type: 'YeyingIdentityDocumentProofV1', verificationMethod: `${identity}#controller-1`, proofValue: sign(null, Buffer.from(canonicalize(accountIdentityDocument)), privateKey).toString('base64url') } }

function createDocument(walletIdentityId: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const nextIdentity = `did:yeying:${walletIdentityId}`
  const unsigned = {
    version: 1, id: nextIdentity, walletIdentityId, createdAt: '2026-08-13T00:00:00.000Z', updatedAt: '2026-08-13T00:00:00.000Z', revision: 1,
    controllers: [{ controllerId: 'controller-1', kind: 'wallet_key', publicKey: (publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32).toString('base64url'), algorithm: 'Ed25519', purposes: ['authentication', 'assertion', 'manage'], status: 'active' }], accounts: [], issuers: [], recovery: { version: 1, manageThreshold: 1, controllerChangeDelaySeconds: 86400 }
  }
  return { identity: nextIdentity, document: { ...unsigned, proof: { type: 'YeyingIdentityDocumentProofV1', verificationMethod: `${nextIdentity}#controller-1`, proofValue: sign(null, Buffer.from(canonicalize(unsigned)), privateKey).toString('base64url') } } }
}

const { issueAccountLinkChallenge, verifyAccountLink } = await import('../src/auth/identityAccountLink')
const { IdentityEmailService } = await import('../src/domain/service/identityEmail')

describe('identity email credential', () => {
  it('issues an EmailCredential only after email code confirmation', async () => {
    const wallet = Wallet.createRandom()
    const link = await issueAccountLinkChallenge({ identity, account: { chainKey: 'eip155:1', address: wallet.address } })
    await verifyAccountLink({ identityDocument: document, identity, account: link.account, nonce: link.nonce, issuedAt: link.issuedAt, expiresAt: link.expiresAt, accountSignature: await wallet.signMessage(link.message) })
    let sent = ''
    const service = new IdentityEmailService(async ({ code }) => { sent = code })
    const request = await service.request({ types: ['email'], identity, account: link.account, email: 'Alice@Example.com' })
    expect(request.email).toBe('alice@example.com')
    await expect(service.confirm({ types: ['email'], verificationId: request.verificationId, codes: { email: '000000' } })).rejects.toThrow('IDENTITY_EMAIL_VERIFICATION_INVALID')
    const result = await service.confirm({ types: ['email'], verificationId: request.verificationId, codes: { email: sent } })
    expect(result.credentials[0].credentialId).toContain('urn:yeying:credential:email:email_')
    expect(result.credentials[0].type).toBe('EmailCredential')
    expect(result.types).toEqual(['email'])
  })

  it('treats unsupported types as an atomic transaction failure', async () => {
    const wallet = Wallet.createRandom()
    const link = await issueAccountLinkChallenge({ identity, account: { chainKey: 'eip155:1', address: wallet.address } })
    await verifyAccountLink({ identityDocument: document, identity, account: link.account, nonce: link.nonce, issuedAt: link.issuedAt, expiresAt: link.expiresAt, accountSignature: await wallet.signMessage(link.message) })
    const service = new IdentityEmailService(async () => {})
    await expect(service.request({ types: ['email', 'phone'], identity, account: link.account, email: 'alice@example.com' })).rejects.toThrow('IDENTITY_VERIFICATION_TYPE_UNSUPPORTED')
  })

  it('completes email and username in one atomic verification transaction', async () => {
    const wallet = Wallet.createRandom()
    const link = await issueAccountLinkChallenge({ identity, account: { chainKey: 'eip155:1', address: wallet.address } })
    await verifyAccountLink({ identityDocument: document, identity, account: link.account, nonce: link.nonce, issuedAt: link.issuedAt, expiresAt: link.expiresAt, accountSignature: await wallet.signMessage(link.message) })
    let sent = ''
    const service = new IdentityEmailService(async ({ code }) => { sent = code })
    const request = await service.request({ types: ['email', 'username', 'avatar'], identity, account: link.account, email: 'alice@example.com', username: 'Alice_01', avatarUri: 'https://avatar.example/alice.png' } as any)
    expect(request.username).toBe('alice_01')
    expect(request.avatarUri).toBe('https://avatar.example/alice.png')
    const result = await service.confirm({ types: ['email', 'username', 'avatar'], verificationId: request.verificationId, codes: { email: sent } })
    expect(result.credentials.map(item => item.type)).toEqual(['UsernameCredential', 'EmailCredential', 'AvatarCredential'])
  })

  it('allows the same identity to retry a username and rejects another identity', async () => {
    const wallet = Wallet.createRandom()
    const link = await issueAccountLinkChallenge({ identity, account: { chainKey: 'eip155:1', address: wallet.address } })
    await verifyAccountLink({ identityDocument: document, identity, account: link.account, nonce: link.nonce, issuedAt: link.issuedAt, expiresAt: link.expiresAt, accountSignature: await wallet.signMessage(link.message) })
    const service = new IdentityEmailService(async () => {})
    await service.request({ types: ['username'], identity, account: link.account, email: 'alice@example.com', username: 'reserved_name' } as any)
    await expect(service.request({ types: ['username'], identity, account: link.account, email: 'alice@example.com', username: 'Reserved_Name' } as any)).resolves.toMatchObject({ username: 'reserved_name' })

    await SingletonDataSource.get().getRepository(IdentityUsernameDO).update(
      { namespace: 'node.yeying.pub', normalizedUsername: 'reserved_name' },
      { identityDid: `${identity}_other` }
    )
    await expect(service.request({ types: ['username'], identity, account: link.account, email: 'other@example.com', username: 'reserved_name' } as any)).rejects.toThrow('IDENTITY_USERNAME_TAKEN')
  })

  it('replaces the previous active username when the same identity verifies a new one', async () => {
    const wallet = Wallet.createRandom()
    const fixture = createDocument('wid_username_replace_123456')
    const link = await issueAccountLinkChallenge({ identity: fixture.identity, account: { chainKey: 'eip155:1', address: wallet.address } })
    await verifyAccountLink({ identityDocument: fixture.document, identity: fixture.identity, account: link.account, nonce: link.nonce, issuedAt: link.issuedAt, expiresAt: link.expiresAt, accountSignature: await wallet.signMessage(link.message) })
    let sent = ''
    const service = new IdentityEmailService(async ({ code }) => { sent = code })

    const first = await service.request({ types: ['username'], identity: fixture.identity, account: link.account, email: 'first@example.com', username: 'first_name' } as any)
    await service.confirm({ types: ['username'], verificationId: first.verificationId, codes: { email: sent } })
    const second = await service.request({ types: ['username'], identity: fixture.identity, account: link.account, email: 'second@example.com', username: 'second_name' } as any)
    await service.confirm({ types: ['username'], verificationId: second.verificationId, codes: { email: sent } })
    const third = await service.request({ types: ['username'], identity: fixture.identity, account: link.account, email: 'third@example.com', username: 'second_name' } as any)
    await service.confirm({ types: ['username'], verificationId: third.verificationId, codes: { email: sent } })

    const rows = await SingletonDataSource.get().getRepository(IdentityUsernameDO).findBy({ namespace: 'node.yeying.pub', identityDid: fixture.identity })
    expect(rows.filter(row => row.status === 'active').map(row => row.normalizedUsername)).toEqual(['second_name'])
    expect(rows.find(row => row.normalizedUsername === 'first_name')?.status).toBe('replaced')
    const credentials = await SingletonDataSource.get().getRepository(IdentityCredentialDO).findBy({ identityDid: fixture.identity, credentialType: 'UsernameCredential' })
    expect(credentials.filter(row => row.status === 'active')).toHaveLength(1)
  })
})
