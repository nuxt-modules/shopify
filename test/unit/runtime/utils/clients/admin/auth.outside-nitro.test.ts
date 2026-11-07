import { describe, expect, it, vi } from 'vitest'

import { createAdminApiClient } from '#src/runtime/utils/clients'

vi.mock('nitropack/runtime', () => {
  throw new Error('nitropack/runtime only resolves inside a Nitro build')
})

describe('admin client outside Nitro', () => {
  it('keeps the access token in memory, so a script sends one token request for many API requests', async () => {
    const fetchMock = vi.fn(async (url: string) => new Response(
      JSON.stringify(url.endsWith('/admin/oauth/access_token')
        ? { access_token: 'script-token', expires_in: 3600 }
        : { data: { shop: { name: 'Shop' } } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))

    vi.stubGlobal('fetch', fetchMock)

    const admin = createAdminApiClient({ name: 'script-shop', clients: { admin: { clientId: 'client-id', clientSecret: 'client-secret' } } } as never)

    for (let request = 0; request < 3; request++) {
      await expect(admin.request('query Shop { shop { name } }')).resolves.toMatchObject({ data: { shop: { name: 'Shop' } } })
    }

    const tokenRequests = fetchMock.mock.calls.filter(([url]) => url.endsWith('/admin/oauth/access_token'))

    expect(tokenRequests).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
