import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAdminAccessToken } from '../../src/runtime/utils/clients/admin/auth'

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

  it('requires both a client id and secret when no access token is set', async () => {
    stubTokenEndpoint()

    await expect(getAdminAccessToken('shop', { clientId: 'client-id' } as never)).rejects.toThrow(/clientId. or .clientSecret/)
  })

  it('mints a token per shop for concurrent requests', async () => {
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

  it('shares a single in-flight request per shop', async () => {
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
