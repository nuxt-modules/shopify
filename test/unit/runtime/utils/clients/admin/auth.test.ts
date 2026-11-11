import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'

import { getAdminAccessToken } from '#src/runtime/utils/clients/admin/auth'

vi.mock('nitropack/runtime', async () => {
  const { createStorage } = await import('unstorage')

  const storage = createStorage()

  return { useStorage: () => storage }
})

const { warnUnmountedStorage } = vi.hoisted(() => ({ warnUnmountedStorage: vi.fn() }))

vi.mock('#src/runtime/utils/storage', () => ({ warnUnmountedStorage }))

const credentials = { clientId: 'client-id', clientSecret: 'client-secret' }

let resolvers: Array<() => void>

function stubTokenEndpoint({ defer = false } = {}) {
  resolvers = []

  const fetchMock = vi.fn(async (url: string, init: { body: URLSearchParams }) => {
    const shop = new URL(url).hostname.split('.')[0]
    const grant = init.body.get('grant_type')

    if (defer) {
      await new Promise<void>(resolve => resolvers.push(resolve))
    }

    return new Response(
      JSON.stringify({ access_token: `${shop}-${grant}-token`, expires_in: 3600 }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('admin access token', () => {
  it('returns a statically configured access token as-is', async () => {
    const fetchMock = stubTokenEndpoint()

    await expect(getAdminAccessToken('shop', { accessToken: 'static-token' } as never)).resolves.toBe('static-token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps using a static access token when no refresh token is configured', async () => {
    const fetchMock = stubTokenEndpoint()

    await expect(getAdminAccessToken('shop', { ...credentials, accessToken: 'static-token' } as never))
      .resolves.toBe('static-token')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exchanges a configured refresh token instead of reusing the access token forever', async () => {
    const fetchMock = stubTokenEndpoint()

    await expect(getAdminAccessToken('shop', {
      ...credentials,
      accessToken: 'expired-token',
      refreshToken: 'refresh-token',
    } as never)).resolves.toBe('shop-refresh_token-token')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![1].body.get('grant_type')).toBe('refresh_token')
    expect(fetchMock.mock.calls[0]![1].body.get('refresh_token')).toBe('refresh-token')
  })

  it('creates one token per shop for concurrent requests', async () => {
    const fetchMock = stubTokenEndpoint({ defer: true })

    const pending = Promise.all([
      getAdminAccessToken('shop-a', credentials as never),
      getAdminAccessToken('shop-b', credentials as never),
    ])

    await vi.waitFor(() => expect(resolvers).toHaveLength(2))

    for (const resolve of resolvers) resolve()

    await expect(pending).resolves.toStrictEqual([
      'shop-a-client_credentials-token',
      'shop-b-client_credentials-token',
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares one in-flight request per shop', async () => {
    const fetchMock = stubTokenEndpoint({ defer: true })

    const pending = Promise.all([
      getAdminAccessToken('shop-a', credentials as never),
      getAdminAccessToken('shop-a', credentials as never),
    ])

    await vi.waitFor(() => expect(resolvers).toHaveLength(1))

    for (const resolve of resolvers) resolve()

    await expect(pending).resolves.toStrictEqual([
      'shop-a-client_credentials-token',
      'shop-a-client_credentials-token',
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('stored admin access token', () => {
  it('reuses the stored token for the same shop and client', async () => {
    const fetchMock = stubTokenEndpoint()

    await getAdminAccessToken('stored-shop', credentials as never, { storage: true })

    await expect(getAdminAccessToken('stored-shop', credentials as never, { storage: true }))
      .resolves.toBe('stored-shop-client_credentials-token')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the stored tokens of different shops apart', async () => {
    const fetchMock = stubTokenEndpoint()

    await getAdminAccessToken('first-shop', credentials as never, { storage: true })

    await expect(getAdminAccessToken('second-shop', credentials as never, { storage: true }))
      .resolves.toBe('second-shop-client_credentials-token')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the stored tokens of different clients of one shop apart', async () => {
    stubTokenEndpoint()

    await getAdminAccessToken('shared-shop', credentials as never, { storage: true })

    const fetchMock = stubTokenEndpoint()

    await getAdminAccessToken('shared-shop', { ...credentials, clientId: 'other-client' } as never, { storage: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![1].body.get('client_id')).toBe('other-client')
  })
})

describe('admin access token failures', () => {
  it('logs Shopify\'s answer and hands the visitor only a bad gateway', async () => {
    const log = vi.fn()

    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      'Missing or invalid client secret for client-id',
      { status: 400, statusText: 'Bad Request' },
    )))

    const error = await getAdminAccessToken('shop', credentials as never, { logger: { reporters: [{ log }] } }).catch(error => error)

    expect(error).toMatchObject({ statusCode: 502, statusMessage: 'Bad Gateway', message: '[shopify] Request to Shopify failed' })
    expect(JSON.stringify(error)).not.toContain('client-id')
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', args: ['Failed to obtain an Admin API access token: HTTP 400 - Missing or invalid client secret for client-id'] }),
      expect.anything(),
    )
  })

  it.each([
    ['a network failure', async () => { throw new TypeError('fetch failed') }, 'TypeError: fetch failed'],
    ['a response that is not JSON', async () => new Response('<html>Maintenance</html>', { status: 200 }), 'SyntaxError'],
  ])('logs %s and hands the visitor only a bad gateway', async (_, fetchMock, detail) => {
    const log = vi.fn()

    vi.stubGlobal('fetch', vi.fn(fetchMock))

    await expect(getAdminAccessToken('shop', credentials as never, { logger: { reporters: [{ log }] } }))
      .rejects.toMatchObject({ statusCode: 502, statusMessage: 'Bad Gateway', message: '[shopify] Request to Shopify failed' })

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', args: [expect.stringContaining(`Failed to obtain an Admin API access token: ${detail}`)] }),
      expect.anything(),
    )
  })

  it('gives up on a token endpoint that never answers after Hydrogen\'s 30 seconds, instead of stalling every admin request', async () => {
    const deadline = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)

    onTestFinished(() => timeout.mockRestore())

    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      if (init?.signal?.aborted) reject(init.signal.reason)

      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))
    })))

    const pending = getAdminAccessToken('slow-shop', credentials as never)

    deadline.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))

    await expect(pending).rejects.toMatchObject({ statusCode: 502 })
    expect(timeout).toHaveBeenCalledWith(30_000)
  })

  it('warns when nothing is mounted at the configured token storage, as the tokens then end up in Nitro\'s memory', async () => {
    const logger = { reporters: [{ log: vi.fn() }] }

    stubTokenEndpoint()

    await getAdminAccessToken('shop', { ...credentials, tokenStorage: 'missing-admin-tokens' } as never, { storage: true, logger })

    expect(warnUnmountedStorage).toHaveBeenCalledWith(expect.anything(), 'missing-admin-tokens', logger)
  })

  it('checks the default token storage mount as well', async () => {
    stubTokenEndpoint()

    await getAdminAccessToken('default-mount-shop', credentials as never, { storage: true })

    expect(warnUnmountedStorage).toHaveBeenCalledWith(expect.anything(), 'admin-token', undefined)
  })

  it('reports a bad gateway when the token response carries no access token, and logs why', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ scope: 'read_products' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )))

    const log = vi.fn()

    await expect(getAdminAccessToken('shop', credentials as never, { logger: { reporters: [{ log }] } })).rejects.toMatchObject({
      statusCode: 502,
      message: '[shopify] Request to Shopify failed',
    })
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', args: ['Failed to obtain an Admin API access token: missing `access_token` in response'] }),
      expect.anything(),
    )
  })

  it('reports incomplete credentials as a server misconfiguration without requesting a token', async () => {
    const fetchMock = stubTokenEndpoint()

    await expect(getAdminAccessToken('shop', { clientId: 'client-id' } as never)).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('missing `clientId` or `clientSecret`'),
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
