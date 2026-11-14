import type { ShopifyScriptsI18n } from '@shopify/hydrogen'
import type { H3Event } from 'h3'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'

type RenderedHook = (context: { ssrContext: Record<string, unknown> }) => Promise<void>

const runtimeConfig = {
  _shopify: {
    name: 'my-shop',
    clients: { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: 'public-token' } } as Record<string, unknown>,
    analytics: false,
    routeTemplates: {} as Record<string, string>,
  },
}

const fetchMock = vi.fn<typeof fetch>()
const navigateTo = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('#imports', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  navigateTo,
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  getRouteRules: () => ({}),
  useNitroApp: () => ({ hooks: { callHook: vi.fn() } }),
  useStorage: vi.fn(),
}))

const middleware = (await import('#src/runtime/server/middleware/routes')).default
const plugin = (await import('#src/runtime/plugins/redirects')).default as unknown as { setup: (nuxtApp: unknown) => void }

const urlRedirects = (target?: string) => Response.json({ data: { urlRedirects: { edges: target ? [{ node: { target } }] : [] } } })

function request(path: string, market?: ShopifyScriptsI18n): Promise<H3Event> {
  const event = createTestEvent({ path, headers: { host: 'shop.test', accept: 'text/html' } })

  event.context.shopifyMarket = market ?? { country: 'US', language: 'EN' }

  return middleware(event).then(() => event)
}

async function render(event: H3Event, ssrContext: Record<string, unknown> = { error: false, payload: { error: { statusCode: 404 } } }) {
  let rendered: RenderedHook | undefined

  plugin.setup({
    hook: (name: string, hook: RenderedHook) => void (name === 'app:rendered' && (rendered = hook)),
    runWithContext: (run: () => unknown) => run(),
  })

  await rendered!({ ssrContext: { event, ...ssrContext } })
}

beforeEach(() => {
  vi.clearAllMocks()

  runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: 'public-token' } }
  runtimeConfig._shopify.routeTemplates = { product: '/product/:productHandle' }
  fetchMock.mockImplementation(async () => urlRedirects())
})

describe('redirects', () => {
  it('sends Shopify\'s product path to the app\'s product page', async () => {
    await render(await request('/products/shirt?ref=email'))

    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/product/shirt?ref=email', { external: true, redirectCode: 301 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the locale prefix of the request\'s market', async () => {
    await render(await request('/de-de/products/shirt', { country: 'DE', language: 'DE', pathPrefix: '/de-de' }))

    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/de-de/product/shirt', { external: true, redirectCode: 301 })
  })

  it('sends /admin to the store\'s admin', async () => {
    await render(await request('/admin'))

    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('https://my-shop.myshopify.com/admin', { external: true, redirectCode: 301 })
  })

  it('follows the URL redirects of the store, asked with the public access token', async () => {
    fetchMock.mockImplementation(async () => urlRedirects('/pages/new-page'))

    await render(await request('/old-page'))

    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/pages/new-page', { external: true, redirectCode: 301 })

    const [url, init] = fetchMock.mock.calls[0]!

    expect(String(url)).toBe(`https://my-shop.myshopify.com/api/${API_VERSION}/graphql.json`)
    expect(new Headers(init?.headers).get('x-shopify-storefront-access-token')).toBe('public-token')
  })

  it('keeps the not found page when the store has no redirect', async () => {
    await render(await request('/old-page'))

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('leaves pages that rendered alone', async () => {
    await render(await request('/products/shirt'), { error: false, payload: {} })
    await render(await request('/products/shirt'), { error: false, payload: { error: { statusCode: 500 } } })

    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('looks a page up once, not again for Nuxt\'s error page', async () => {
    await render(await request('/old-page'), { error: true, payload: { error: { statusCode: 404 } } })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('stays off without a storefront client or analytics', async () => {
    runtimeConfig._shopify.clients = {}

    await render(await request('/products/shirt'))

    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('stays off when the storefront client turns its routes off', async () => {
    runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, routes: false, publicAccessToken: 'public-token' } }

    await render(await request('/products/shirt'))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
