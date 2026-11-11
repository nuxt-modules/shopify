import { describe, expect, it, vi } from 'vitest'

const resolvable = new Set<string>()

vi.mock('exsolve', () => ({
  resolveModulePath: (id: string) => resolvable.has(id) ? `/app/node_modules/${id}` : undefined,
}))

const { default: setupVite } = await import('#src/setup/vite')

function preBundled(config: Record<string, unknown>) {
  const nuxt = { options: { rootDir: '/app', vite: {} as { optimizeDeps?: { include?: string[] } } } }

  setupVite(nuxt as never, config as never)

  return nuxt.options.vite.optimizeDeps?.include
}

const storefront = { publicAccessToken: 'public', cache: { browser: { ttl: 60_000 } } }

describe('setupVite', () => {
  it('pre-bundles the copies the module depends on, even when the app has other versions of them', () => {
    resolvable.clear()
    resolvable.add('@nuxtjs/shopify').add('lru-cache').add('@shopify/graphql-client').add('@shopify/hydrogen')

    expect(preBundled({ clients: { storefront }, analytics: false })).toEqual([
      '@nuxtjs/shopify > @shopify/graphql-client',
      '@nuxtjs/shopify > @shopify/hydrogen',
      '@nuxtjs/shopify > @shopify/hydrogen/customer-account',
      '@nuxtjs/shopify > @shopify/hydrogen/vue',
      '@nuxtjs/shopify > lru-cache',
    ])
  })

  it('leaves lru-cache out for a private storefront client, which has no browser cache', () => {
    resolvable.clear()
    resolvable.add('@nuxtjs/shopify').add('lru-cache').add('@shopify/graphql-client').add('@shopify/hydrogen')

    expect(preBundled({ clients: { storefront: { privateAccessToken: 'private', cache: storefront.cache } }, analytics: false }))
      .not.toContain('@nuxtjs/shopify > lru-cache')
  })

  it('pre-bundles Hydrogen for the customer account client, which loads it in the browser too', () => {
    resolvable.clear()
    resolvable.add('@nuxtjs/shopify')

    expect(preBundled({ clients: { customerAccount: { clientId: 'cid' } }, analytics: false })).toContain('@nuxtjs/shopify > @shopify/hydrogen')
  })

  it('falls back to the app\'s own copies when the module is loaded from a path', () => {
    resolvable.clear()
    resolvable.add('lru-cache').add('@shopify/graphql-client').add('@shopify/hydrogen').add('@shopify/hydrogen/customer-account').add('@shopify/hydrogen/vue')

    expect(preBundled({ clients: { storefront }, analytics: true })).toEqual(['@shopify/graphql-client', '@shopify/hydrogen', '@shopify/hydrogen/customer-account', '@shopify/hydrogen/vue', 'lru-cache'])
  })

  it('pre-bundles the GraphQL client for analytics without a storefront client, since Shopify\'s scripts look up the shop with it', () => {
    resolvable.clear()
    resolvable.add('@nuxtjs/shopify')

    expect(preBundled({ clients: { admin: { accessToken: 'token' } }, analytics: true })).toContain('@nuxtjs/shopify > @shopify/graphql-client')
  })

  it('pre-bundles nothing for the Admin API client, which never runs in the browser', () => {
    resolvable.clear()
    resolvable.add('@nuxtjs/shopify')

    expect(preBundled({ clients: { admin: { accessToken: 'token' } }, analytics: false })).toEqual([])
  })
})
