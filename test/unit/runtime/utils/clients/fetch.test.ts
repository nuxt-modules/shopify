import { Agent } from 'undici'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function importFetch() {
  vi.resetModules()

  return await import('#src/runtime/utils/clients/fetch')
}

function stubFetch() {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(new Response('ok')))

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

describe('shopifyFetch', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, Symbol.for('nuxt-shopify:dispatcher'))
    vi.unstubAllGlobals()
  })

  it('sends requests through the dispatcher, loaded once on the first request', async () => {
    const fetchMock = stubFetch()
    const { setShopifyDispatcher, shopifyFetch } = await importFetch()

    const dispatcher = new Agent()
    const load = vi.fn(async () => dispatcher)

    setShopifyDispatcher(load)

    expect(load).not.toHaveBeenCalled()

    const signal = AbortSignal.timeout(1000)

    await shopifyFetch('https://shop.myshopify.com/api/graphql.json', { method: 'POST', body: '{}', signal })
    await shopifyFetch('https://shop.myshopify.com/api/graphql.json')

    expect(fetchMock.mock.calls).toEqual([
      ['https://shop.myshopify.com/api/graphql.json', { method: 'POST', body: '{}', signal, dispatcher }],
      ['https://shop.myshopify.com/api/graphql.json', { dispatcher }],
    ])
    expect(load).toHaveBeenCalledOnce()
  })

  it('shares the dispatcher between the server bundles', async () => {
    const vue = await importFetch()
    const nitro = await importFetch()

    const dispatcher = new Agent()

    nitro.setShopifyDispatcher(async () => dispatcher)

    expect(await vue.getShopifyDispatcher()).toBe(dispatcher)
  })

  it('leaves requests unchanged without a dispatcher', async () => {
    const fetchMock = stubFetch()
    const { shopifyFetch } = await importFetch()

    const init = { method: 'POST', body: '{}' }

    await shopifyFetch('https://shop.myshopify.com/api/graphql.json', init)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://shop.myshopify.com/api/graphql.json', init)
  })

  it('falls back to the default dispatcher when the dispatcher fails to load', async () => {
    const fetchMock = stubFetch()
    const { setShopifyDispatcher, shopifyFetch } = await importFetch()

    setShopifyDispatcher(() => Promise.reject(new Error('Cannot find package \'undici\'')))

    await shopifyFetch('https://shop.myshopify.com/api/graphql.json')

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://shop.myshopify.com/api/graphql.json', undefined)
  })

  it('leaves requests unchanged in the browser', async () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    const { getShopifyDispatcher, setShopifyDispatcher } = await importFetch()

    setShopifyDispatcher(async () => new Agent())

    await expect(getShopifyDispatcher()).resolves.toBeUndefined()
  })
})
