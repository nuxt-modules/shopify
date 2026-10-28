import type { Nuxt } from '@nuxt/schema'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION, OTHER_API_VERSION } from '#test/helpers/api-version'

const installed = new Set<string>()
const versions = new Map<string, string>()
const persisted: Array<[string, string]> = []

const warnings: string[] = []

vi.mock('#src/utils/install', () => ({
  isInstalled: (id: string) => installed.has(id),
  isResolvableFrom: () => true,
  getInstalledVersion: (id: string) => Promise.resolve(versions.get(id)),
}))

vi.mock('#src/utils/log', () => ({
  initLogger: () => undefined,
  useLogger: () => ({
    warn: (message: string) => void warnings.push(message),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('#src/utils/session', async importOriginal => ({
  ...await importOriginal<typeof import('#src/utils/session')>(),
  persistSessionPassword: (rootDir: string, password: string) => {
    persisted.push([rootDir, password])

    return Promise.resolve()
  },
}))

const { configSchema, publicConfigSchema } = await import('#src/schemas')

const apiUrl = (apiVersion: string) => `https://shopify.com/1234/account/customer/api/${apiVersion}/graphql`

const API_URL = apiUrl(API_VERSION)

function nuxtStub(options: Record<string, unknown> = {}) {
  return { options: { ssr: true, dev: false, rootDir: '/tmp/shop', ...options } } as unknown as Nuxt
}

async function resolve(input: Record<string, unknown>, nuxt = nuxtStub()) {
  const config = await configSchema.parseAsync({ ...input, _nuxt: nuxt })

  return { config, publicConfig: publicConfigSchema.parse(config) }
}

function stubApiUrl(url: string) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ graphql_api: url }) })))
}

const storefront = { publicAccessToken: 'tok' }

beforeEach(() => {
  installed.clear()
  installed.add('@shopify/hydrogen')

  versions.clear()
  versions.set('@shopify/hydrogen', '2026.10.2')

  persisted.length = 0
  warnings.length = 0

  delete process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD

  stubApiUrl(API_URL)
})

describe('peer dependency requirements', () => {
  it('keeps analytics enabled with hydrogen 2026.10', async () => {
    const { config, publicConfig } = await resolve({ name: 'shop', clients: { storefront }, analytics: { storefrontId: '1' } })

    expect(config.analytics).toMatchObject({ storefrontId: '1' })
    expect(publicConfig.analytics).toMatchObject({ storefrontId: '1' })
  })

  it('disables analytics in both configs when hydrogen is older than 2026.10', async () => {
    versions.set('@shopify/hydrogen', '2026.4.6')

    const { config, publicConfig } = await resolve({ name: 'shop', clients: { storefront }, analytics: true })

    expect(config.analytics).toBe(false)
    expect(publicConfig.analytics).toBe(false)
    expect(warnings).toContainEqual(expect.stringContaining('needs `@shopify/hydrogen` 2026.10 or newer'))
  })

  it('keeps analytics without a public storefront token', async () => {
    const { config } = await resolve({
      name: 'shop',
      clients: { storefront: { privateAccessToken: 'private' } },
      analytics: true,
    })

    expect(config.analytics).not.toBe(false)
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

describe('proxy requires a server', () => {
  const input = { name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid' } } }

  it('keeps the proxies unless prerendering, even when ssr is off', async () => {
    const { config, publicConfig } = await resolve(input, nuxtStub({ ssr: false }))

    expect(config.clients.storefront?.proxy).toEqual({ route: '_proxy/storefront' })
    expect(config.clients.customerAccount?.proxy).toEqual({ route: '_proxy/customer-account' })
    expect(publicConfig.clients.storefront?.proxy).toEqual({ route: '_proxy/storefront' })
    expect(publicConfig.clients.customerAccount?.proxy).toEqual({ route: '_proxy/customer-account' })
  })

  it('disables every proxy in both configs when prerendering the whole app', async () => {
    const { config, publicConfig } = await resolve(input, nuxtStub({ _generate: true }))

    expect(config.clients.storefront?.proxy).toBe(false)
    expect(config.clients.customerAccount?.proxy).toBe(false)
    expect(publicConfig.clients.storefront?.proxy).toBe(false)
    expect(publicConfig.clients.customerAccount?.proxy).toBe(false)
  })

  it('warns that analytics cannot reach Shopify without a server', async () => {
    const { config } = await resolve({ ...input, analytics: true }, nuxtStub({ _generate: true }))

    expect(config.analytics).not.toBe(false)
    expect(warnings).toContainEqual(expect.stringContaining('Static generation has no server for the paths Shopify\'s scripts call'))
  })
})

describe('customer account proxy opt-out', () => {
  it('warns that the browser client cannot authenticate without the proxy', async () => {
    await resolve({ name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid', proxy: false } } })

    const message = warnings.join('\n')

    expect(message).toContain('customer account proxy is disabled')
    expect(message).toContain('useCustomerAccount()')
  })

  it('stays quiet while the proxy is enabled', async () => {
    await resolve({ name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid' } } })

    expect(warnings.join('\n')).not.toContain('customer account proxy is disabled')
  })

  it('leaves the static generation warning as the only one when prerendering', async () => {
    await resolve(
      { name: 'shop', clients: { storefront, customerAccount: { clientId: 'cid' } } },
      nuxtStub({ _generate: true }),
    )

    const matches = warnings.filter(message => message.includes('customer account proxy'))

    expect(matches).toHaveLength(1)
    expect(matches[0]).toContain('static generation has no server')
  })

  it('stays quiet when the storefront proxy alone is disabled', async () => {
    await resolve({ name: 'shop', clients: { storefront: { ...storefront, proxy: false } } })

    expect(warnings.join('\n')).not.toContain('customer account proxy is disabled')
  })
})

describe('customer account api url', () => {
  const input = { name: 'shop', clients: { customerAccount: { clientId: 'cid' } } }

  it('resolves the url from the well-known endpoint into both configs', async () => {
    const { config, publicConfig } = await resolve({
      name: 'shop',
      clients: { customerAccount: { clientId: 'cid', apiVersion: API_VERSION } },
    })

    expect(fetch).toHaveBeenCalledWith('https://shop.myshopify.com/.well-known/customer-account-api')
    expect(config.clients.customerAccount?.apiURL).toBe(API_URL)
    expect(publicConfig.clients.customerAccount?.apiURL).toBe(API_URL)
  })

  it('pins the resolved url to the configured api version', async () => {
    stubApiUrl(apiUrl(OTHER_API_VERSION))

    const { config } = await resolve({
      name: 'shop',
      clients: { customerAccount: { clientId: 'cid', apiVersion: API_VERSION } },
    })

    expect(config.clients.customerAccount?.apiURL).toBe(apiUrl(API_VERSION))
  })

  it('leaves an unversioned well-known url untouched', async () => {
    const unversioned = 'https://shopify.com/1234/account/customer/graphql'

    stubApiUrl(unversioned)

    const { config } = await resolve(input)

    expect(config.clients.customerAccount?.apiURL).toBe(unversioned)
  })

  it('prefers a configured url and skips the lookup', async () => {
    const configured = `https://shopify.com/9/account/customer/api/${API_VERSION}/graphql`

    const { config } = await resolve({ name: 'shop', clients: { customerAccount: { clientId: 'cid', apiURL: configured } } })

    expect(fetch).not.toHaveBeenCalled()
    expect(config.clients.customerAccount?.apiURL).toBe(configured)
  })

  it('leaves the url unset when the lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))

    const { config } = await resolve(input)

    expect(config.clients.customerAccount?.apiURL).toBeUndefined()
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
})

describe('api version window', () => {
  it('warns about a version that left the supported window without failing the build', async () => {
    const { config } = await resolve({ name: 'shop', clients: { storefront: { ...storefront, apiVersion: '2020-01' } } })

    expect(config.clients.storefront?.apiVersion).toBe('2020-01')
    expect(warnings.join('\n')).toContain('`2020-01`')
    expect(warnings.join('\n')).toContain('outside the window')
    expect(warnings.join('\n')).toContain(API_VERSION)
  })

  it('stays quiet for a version inside the window', async () => {
    const { config } = await resolve({ name: 'shop', clients: { storefront: { ...storefront, apiVersion: API_VERSION } } })

    expect(config.clients.storefront?.apiVersion).toBe(API_VERSION)
    expect(warnings.join('\n')).not.toContain('outside the window')
  })

  it('names the client that carries the stale version', async () => {
    await resolve({ name: 'shop', clients: { customerAccount: { clientId: 'cid', apiVersion: '2020-01' } } })

    expect(warnings.join('\n')).toContain('customer-account client')
  })
})
