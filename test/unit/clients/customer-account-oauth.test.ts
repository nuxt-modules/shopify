import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildAuthorizationParams,
  exchangeAuthorizationCode,
  getIdTokenNonce,
  getOpenIdConfiguration,
  normalizeLocale,
  refreshAccessToken,
  sanitizeReturnPath,
} from '#src/runtime/utils/clients/customer-account/auth'

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

const configuration = {
  issuer: 'https://shopify.example',
  authorization_endpoint: 'https://shopify.example/oauth/authorize',
  token_endpoint: 'https://shopify.example/oauth/token',
  end_session_endpoint: 'https://shopify.example/oauth/logout',
}

const BASIC_AUTH = `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`

function stubFetch(response: unknown) {
  const fetch = vi.fn(async () => response)

  vi.stubGlobal('$fetch', fetch)

  return fetch
}

function tokenRequest(fetch: ReturnType<typeof stubFetch>) {
  const [url, options] = fetch.mock.calls[0] as unknown as [string, { body: string, headers: Record<string, string> }]

  return { url, body: Object.fromEntries(new URLSearchParams(options.body)), headers: options.headers }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  it('adds the S256 PKCE challenge when a code challenge is given', () => {
    const params = buildAuthorizationParams({ ...baseParams, codeChallenge: 'challenge' })

    expect(params.code_challenge).toBe('challenge')
    expect(params.code_challenge_method).toBe('S256')
  })
})

describe('getIdTokenNonce', () => {
  it('reads the nonce claim', () => {
    expect(getIdTokenNonce(encodeIdToken({ nonce: 'nonce-value' }))).toBe('nonce-value')
  })

  it('decodes a non-ASCII nonce from a url-safe payload', () => {
    const token = encodeIdToken({ nonce: 'nönce~~~?' })

    expect(token.split('.')[1]).toMatch(/[-_]/)
    expect(getIdTokenNonce(token)).toBe('nönce~~~?')
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

  it('rejects control characters', () => {
    expect(sanitizeReturnPath('/\t/evil.com')).toBeUndefined()
    expect(sanitizeReturnPath('/\n\r/evil.com')).toBeUndefined()
  })
})

describe('exchangeAuthorizationCode', () => {
  const params = {
    clientId: 'client-id',
    redirectUri: 'https://example.com/_auth/customer-account/callback',
    code: 'authorization-code',
  }

  it('sends the PKCE verifier and no client credentials for a public client', async () => {
    const fetch = stubFetch({ access_token: 'access-token' })

    await exchangeAuthorizationCode(configuration, { ...params, codeVerifier: 'code-verifier' })

    const request = tokenRequest(fetch)

    expect(request.url).toBe(configuration.token_endpoint)
    expect(request.body).toEqual({
      grant_type: 'authorization_code',
      client_id: 'client-id',
      redirect_uri: params.redirectUri,
      code: 'authorization-code',
      code_verifier: 'code-verifier',
    })
    expect(request.headers).not.toHaveProperty('Authorization')
  })

  it('authenticates a confidential client with basic auth instead of a verifier', async () => {
    const fetch = stubFetch({ access_token: 'access-token' })

    await exchangeAuthorizationCode(configuration, { ...params, clientSecret: 'client-secret' })

    const request = tokenRequest(fetch)

    expect(request.body).not.toHaveProperty('code_verifier')
    expect(request.headers.Authorization).toBe(BASIC_AUTH)
  })

  it('rejects a token response without an access token', async () => {
    stubFetch({ token_type: 'Bearer' })

    await expect(exchangeAuthorizationCode(configuration, { ...params, codeVerifier: 'code-verifier' }))
      .rejects.toThrow(/no access token in response/)
  })
})

describe('refreshAccessToken', () => {
  it('sends the refresh token with basic auth for a confidential client', async () => {
    const fetch = stubFetch({ access_token: 'fresh-access-token' })

    await refreshAccessToken(configuration, { clientId: 'client-id', clientSecret: 'client-secret', refreshToken: 'refresh-token' })

    const request = tokenRequest(fetch)

    expect(request.body).toEqual({ grant_type: 'refresh_token', client_id: 'client-id', refresh_token: 'refresh-token' })
    expect(request.headers.Authorization).toBe(BASIC_AUTH)
  })
})

describe('getOpenIdConfiguration', () => {
  it('fetches the discovery document once per store', async () => {
    const fetch = stubFetch(configuration)

    await getOpenIdConfiguration('https://cached.example')

    await expect(getOpenIdConfiguration('https://cached.example')).resolves.toEqual(configuration)
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('https://cached.example/.well-known/openid-configuration')
  })

  it('fetches the discovery document again after a failed request', async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce(configuration)

    vi.stubGlobal('$fetch', fetch)

    await expect(getOpenIdConfiguration('https://retried.example'))
      .rejects.toThrow(/Failed to fetch the customer account OpenID configuration/)
    await expect(getOpenIdConfiguration('https://retried.example')).resolves.toEqual(configuration)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
