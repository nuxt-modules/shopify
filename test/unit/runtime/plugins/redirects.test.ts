import type { ShopifyScriptsI18n } from '@shopify/hydrogen'
import type { H3Event } from 'h3'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent, getResponseHeader } from '#test/helpers/event'

type RenderedHook = (context: { ssrContext: Record<string, unknown> }) => Promise<void>

const runtimeConfig = {
  _shopify: {
    name: 'my-shop',
    clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public-token' } } as Record<string, unknown>,
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

  runtimeConfig._shopify.clients = { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public-token' } }
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

  it('leaves Shopify\'s standard paths to the app without route templates', async () => {
    runtimeConfig._shopify.routeTemplates = {}

    await render(await request('/products/shirt'))

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('still sends /admin to the store\'s admin without route templates', async () => {
    runtimeConfig._shopify.routeTemplates = {}

    await render(await request('/admin'))

    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('https://my-shop.myshopify.com/admin', { external: true, redirectCode: 301 })
  })

  it('stays off without a storefront client or analytics', async () => {
    runtimeConfig._shopify.clients = {}

    await render(await request('/products/shirt'))

    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('variant links', () => {
  const variant = (handle: string) => Response.json({
    data: { node: { selectedOptions: [{ name: 'Color', value: 'Red' }, { name: 'Size', value: 'M' }], product: { handle } } },
  })

  it('opens the variant\'s options on the app\'s product page', async () => {
    fetchMock.mockImplementation(async () => variant('shirt'))

    const event = await request('/product/shirt?variant=123&ref=feed')

    expect(event.node.res.statusCode).toBe(302)
    expect(getResponseHeader(event, 'location')).toBe('http://shop.test/product/shirt?ref=feed&Color=Red&Size=M')
  })

  it('opens the product the variant belongs to', async () => {
    fetchMock.mockImplementation(async () => variant('sweater'))

    const event = await request('/products/shirt?variant=123')

    expect(getResponseHeader(event, 'location')).toBe('http://shop.test/product/sweater?Color=Red&Size=M')
  })

  it('opens the variant\'s options on Shopify\'s standard product path without route templates', async () => {
    runtimeConfig._shopify.routeTemplates = {}
    fetchMock.mockImplementation(async () => variant('shirt'))

    const event = await request('/products/shirt?variant=123')

    expect(getResponseHeader(event, 'location')).toBe('http://shop.test/products/shirt?Color=Red&Size=M')
  })

  it('leaves variant links on other pages and in form posts to the app', async () => {
    const page = await request('/collection/shirts?variant=123')
    const post = createTestEvent({ method: 'POST', path: '/product/shirt?variant=123', headers: { host: 'shop.test' }, body: { quantity: 1 } })

    await middleware(post)

    expect(page.handled).toBe(false)
    expect(post.handled).toBe(false)
    expect(post.context.shopifyRequestContext).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
