import { beforeEach, describe, expect, it, vi } from 'vitest'

const installed = new Set<string>()

vi.mock('../../src/utils/install', () => ({
  isInstalled: (id: string) => installed.has(id),
  isResolvableFrom: () => true,
}))

const { default: setupRequirements } = await import('../../src/setup/requirements')
const { configSchema, publicConfigSchema } = await import('../../src/schemas')

function parse(input: Record<string, unknown>) {
  const config = configSchema.parse(input)
  const publicConfig = publicConfigSchema.parse(input)

  setupRequirements(config, publicConfig)

  return { config, publicConfig }
}

beforeEach(() => {
  installed.clear()
  installed.add('@shopify/hydrogen')
  installed.add('@shopify/hydrogen-react')
})

describe('setup requirements', () => {
  it('keeps analytics enabled when its dependencies and token are present', () => {
    const { config, publicConfig } = parse({
      name: 'shop',
      clients: { storefront: { publicAccessToken: 'tok' } },
      analytics: { storefrontId: '1' },
    })

    expect(config.analytics).toMatchObject({ storefrontId: '1' })
    expect(publicConfig.analytics).toMatchObject({ storefrontId: '1' })
  })

  it('disables analytics in both configs when hydrogen-react is missing', () => {
    installed.delete('@shopify/hydrogen-react')

    const { config, publicConfig } = parse({
      name: 'shop',
      clients: { storefront: { publicAccessToken: 'tok' } },
      analytics: true,
    })

    expect(config.analytics).toBe(false)
    expect(publicConfig.analytics).toBe(false)
  })

  it('disables analytics in both configs when no public storefront token is reachable', () => {
    const { config, publicConfig } = parse({
      name: 'shop',
      clients: { storefront: { privateAccessToken: 'private' } },
      analytics: true,
    })

    expect(config.analytics).toBe(false)
    expect(publicConfig.analytics).toBe(false)
  })

  it('accepts a consent token in place of the storefront token', () => {
    const { config } = parse({
      name: 'shop',
      clients: { storefront: { privateAccessToken: 'private' } },
      analytics: { consent: { storefrontAccessToken: 'consent-token' } },
    })

    expect(config.analytics).toMatchObject({ consent: { storefrontAccessToken: 'consent-token' } })
  })

  it('disables the customer account client in both configs when hydrogen is missing', () => {
    installed.delete('@shopify/hydrogen')

    const { config, publicConfig } = parse({
      name: 'shop',
      clients: { storefront: { publicAccessToken: 'tok' }, customerAccount: { clientId: 'cid' } },
    })

    expect(config.clients.customerAccount).toBeUndefined()
    expect(publicConfig.clients.customerAccount).toBeUndefined()
  })
})
