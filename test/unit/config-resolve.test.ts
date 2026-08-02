import type { Nuxt } from '@nuxt/schema'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const installed = new Set<string>()
const persisted: Array<[string, string]> = []

vi.mock('../../src/utils/install', () => ({
  isInstalled: (id: string) => installed.has(id),
  isResolvableFrom: () => true,
}))

vi.mock('../../src/utils/session', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/utils/session')>(),
  persistSessionPassword: (rootDir: string, password: string) => {
    persisted.push([rootDir, password])

    return Promise.resolve()
  },
}))

const { configSchema, publicConfigSchema } = await import('../../src/schemas')

const API_URL = 'https://shopify.com/1234/account/customer/api/2026-04/graphql'

function nuxtStub(options: Record<string, unknown> = {}) {
  return { options: { ssr: true, dev: false, rootDir: '/tmp/shop', ...options } } as unknown as Nuxt
}

async function resolve(input: Record<string, unknown>, nuxt = nuxtStub()) {
  return parse({ ...input, _nuxt: nuxt })
}

async function parse(input: Record<string, unknown>) {
  const config = await configSchema.parseAsync(input)

  return { config, publicConfig: publicConfigSchema.parse(config) }
}

const storefront = { publicAccessToken: 'tok' }

beforeEach(() => {
  installed.clear()
  installed.add('@shopify/hydrogen')
  installed.add('@shopify/hydrogen-react')

  persisted.length = 0

  delete process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD

  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ graphql_api: API_URL }) })))
})

describe('peer dependency requirements', () => {
  it('keeps analytics enabled when its dependencies and token are present', async () => {
    const { config, publicConfig } = await resolve({ name: 'shop', clients: { storefront }, analytics: { storefrontId: '1' } })

    expect(config.analytics).toMatchObject({ storefrontId: '1' })
    expect(publicConfig.analytics).toMatchObject({ storefrontId: '1' })
  })

  it('disables analytics in both configs when hydrogen-react is missing', async () => {
    installed.delete('@shopify/hydrogen-react')

    const { config, publicConfig } = await resolve({ name: 'shop', clients: { storefront }, analytics: true })

    expect(config.analytics).toBe(false)
    expect(publicConfig.analytics).toBe(false)
  })

  it('disables analytics in both configs when no public storefront token is reachable', async () => {
    const { config, publicConfig } = await resolve({
      name: 'shop',
      clients: { storefront: { privateAccessToken: 'private' } },
      analytics: true,
    })

    expect(config.analytics).toBe(false)
    expect(publicConfig.analytics).toBe(false)
  })

  it('accepts a consent token in place of the storefront token', async () => {
    const { config } = await resolve({
      name: 'shop',
      clients: { storefront: { privateAccessToken: 'private' } },
      analytics: { consent: { storefrontAccessToken: 'consent-token' } },
    })

    expect(config.analytics).toMatchObject({ consent: { storefrontAccessToken: 'consent-token' } })
  })

  it('disables the customer account client in both configs when hydrogen is missing', async () => {
    installed.delete('@shopify/hydrogen')

    const { config, publicConfig } = await resolve({
      name: 'shop',
      clients: { storefront, customerAccount: { clientId: 'cid' } },
    })

    expect(config.clients.customerAccount).toBeUndefined()
    expect(publicConfig.clients.customerAccount).toBeUndefined()
  })
})

describe('proxy requires SSR', () => {
  const input = { name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid' } } }

  it('keeps the proxies when rendering on the server', async () => {
    const { config, publicConfig } = await resolve(input)

    expect(config.clients.storefront?.proxy).toEqual({ path: '_proxy/storefront' })
    expect(publicConfig.clients.storefront?.proxy).toEqual({ path: '_proxy/storefront' })
    expect(publicConfig.clients.customerAccount?.proxy).toEqual({ path: '_proxy/customer-account' })
  })

  it('disables every proxy in both configs when ssr is off', async () => {
    const { config, publicConfig } = await resolve(input, nuxtStub({ ssr: false }))

    expect(config.clients.storefront?.proxy).toBe(false)
    expect(config.clients.customerAccount?.proxy).toBe(false)
    expect(publicConfig.clients.storefront?.proxy).toBe(false)
    expect(publicConfig.clients.customerAccount?.proxy).toBe(false)
  })

  it('disables every proxy in both configs when prerendering the whole app', async () => {
    const { config, publicConfig } = await resolve(input, nuxtStub({ _generate: true }))

    expect(config.clients.storefront?.proxy).toBe(false)
    expect(publicConfig.clients.storefront?.proxy).toBe(false)
  })

  it('leaves an explicit opt-out alone', async () => {
    const { config } = await resolve({ name: 'shop', clients: { storefront: { ...storefront, proxy: false } } })

    expect(config.clients.storefront?.proxy).toBe(false)
  })
})

describe('customer account api url', () => {
  const input = { name: 'shop', clients: { customerAccount: { clientId: 'cid' } } }

  it('resolves the url from the well-known endpoint into both configs', async () => {
    const { config, publicConfig } = await resolve(input)

    expect(fetch).toHaveBeenCalledWith('https://shop.myshopify.com/.well-known/customer-account-api')
    expect(config.clients.customerAccount?.apiUrl).toBe(API_URL)
    expect(publicConfig.clients.customerAccount?.apiUrl).toBe(API_URL)
  })

  it('prefers a configured url and skips the lookup', async () => {
    const configured = 'https://shopify.com/9/account/customer/api/2026-04/graphql'

    const { config } = await resolve({ name: 'shop', clients: { customerAccount: { clientId: 'cid', apiUrl: configured } } })

    expect(fetch).not.toHaveBeenCalled()
    expect(config.clients.customerAccount?.apiUrl).toBe(configured)
  })

  it('leaves the url unset when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))

    const { config } = await resolve(input)

    expect(config.clients.customerAccount?.apiUrl).toBeUndefined()
  })
})

describe('customer account session password', () => {
  const input = { name: 'shop', clients: { customerAccount: { clientId: 'cid' } } }

  it('uses the environment variable when set', async () => {
    process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD = 'x'.repeat(48)

    const { config } = await resolve(input)

    expect(config.clients.customerAccount?.session.password).toBe('x'.repeat(48))
    expect(persisted).toHaveLength(0)
  })

  it('generates and persists one in development', async () => {
    const { config } = await resolve(input, nuxtStub({ dev: true }))

    const password = config.clients.customerAccount?.session.password

    expect(password).toBeTruthy()
    expect(persisted).toEqual([['/tmp/shop', password]])
  })

  it('never generates one in production', async () => {
    const { config } = await resolve(input)

    expect(config.clients.customerAccount?.session.password).toBeUndefined()
    expect(persisted).toHaveLength(0)
  })

  it('never leaks the password into the public config', async () => {
    const { publicConfig } = await resolve(input, nuxtStub({ dev: true }))

    expect(publicConfig.clients.customerAccount).not.toHaveProperty('session')
    expect(JSON.stringify(publicConfig)).not.toContain(persisted[0]![1])
  })
})

describe('without a nuxt instance', () => {
  it('stays pure — no lookups, no writes, no environment gating', async () => {
    installed.clear()

    const { config } = await parse({
      name: 'shop',
      clients: { storefront, customerAccount: { clientId: 'cid' } },
      analytics: true,
    })

    expect(fetch).not.toHaveBeenCalled()
    expect(persisted).toHaveLength(0)
    expect(config.analytics).toMatchObject({ autoPageView: true })
    expect(config.clients.customerAccount).toBeDefined()
    expect(config.clients.storefront?.proxy).toEqual({ path: '_proxy/storefront' })
  })
})
