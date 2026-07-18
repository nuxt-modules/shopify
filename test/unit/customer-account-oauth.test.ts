import { describe, expect, it } from 'vitest'

import {
  buildAuthorizationParams,
  getIdTokenNonce,
  normalizeLocale,
  sanitizeReturnPath,
} from '../../src/runtime/utils/customer-account/oauth'

function encodeIdToken(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `header.${payload}.signature`
}

const baseParams = {
  clientId: 'client-id',
  redirectUri: 'https://example.com/_auth/customer-account/callback',
  scope: ['openid', 'email', 'openid'],
  state: 'state-value',
}

describe('normalizeLocale', () => {
  it.each([
    ['de', 'de'],
    ['DE', 'de'],
    ['pt_BR', 'pt-BR'],
    ['pt-br', 'pt-BR'],
    ['ZH_CN', 'zh-CN'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected)
  })
})

describe('buildAuthorizationParams', () => {
  it('deduplicates the scope and omits optional params when unset', () => {
    const params = buildAuthorizationParams(baseParams)

    expect(params.scope).toBe('openid email')
    expect(params).not.toHaveProperty('nonce')
    expect(params).not.toHaveProperty('locale')
    expect(params).not.toHaveProperty('login_hint')
  })

  it('drops `login_hint_mode` unless a login hint is present', () => {
    const withoutHint = buildAuthorizationParams({ ...baseParams, loginHintMode: 'submit' })
    const withHint = buildAuthorizationParams({
      ...baseParams,
      loginHint: 'customer@example.com',
      loginHintMode: 'submit',
    })

    expect(withoutHint).not.toHaveProperty('login_hint_mode')
    expect(withHint.login_hint_mode).toBe('submit')
    expect(withHint.login_hint).toBe('customer@example.com')
  })

  it('adds the PKCE challenge only when a code challenge is given', () => {
    const params = buildAuthorizationParams({ ...baseParams, codeChallenge: 'challenge' })

    expect(params.code_challenge).toBe('challenge')
    expect(params.code_challenge_method).toBe('S256')
  })
})

describe('getIdTokenNonce', () => {
  it('reads the nonce claim', () => {
    expect(getIdTokenNonce(encodeIdToken({ nonce: 'nonce-value' }))).toBe('nonce-value')
  })

  it('decodes non-ASCII claims without corrupting the payload', () => {
    const token = encodeIdToken({ nonce: 'nonce-value', name: 'Jörg Müller' })

    expect(getIdTokenNonce(token)).toBe('nonce-value')
  })

  it.each([
    ['a token without a nonce claim', encodeIdToken({ sub: '1' })],
    ['a malformed token', 'not-a-jwt'],
    ['an unparsable payload', 'header.!!!.signature'],
  ])('returns undefined for %s', (_label, token) => {
    expect(getIdTokenNonce(token)).toBeUndefined()
  })
})

describe('sanitizeReturnPath', () => {
  it.each([
    ['/account'],
    ['/account?tab=orders&utm_source=news'],
    ['/de/konto#top'],
  ])('accepts the same-origin path %s', (path) => {
    expect(sanitizeReturnPath(path)).toBe(path)
  })

  it.each([
    ['an absolute URL', 'https://evil.com'],
    ['a protocol-relative URL', '//evil.com'],
    ['a backslash-escaped host', '/\\evil.com'],
    ['a relative path', 'account'],
    ['a non-string value', 42],
  ])('rejects %s', (_label, value) => {
    expect(sanitizeReturnPath(value)).toBeUndefined()
  })

  it('rejects control characters that browsers strip while resolving URLs', () => {
    expect(sanitizeReturnPath('/\t/evil.com')).toBeUndefined()
    expect(sanitizeReturnPath('/\n\r/evil.com')).toBeUndefined()
  })
})
