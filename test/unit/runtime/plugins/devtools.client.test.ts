// @vitest-environment happy-dom
import { AnalyticsEvent } from '@shopify/hydrogen'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { postRequest, toDevtoolsRequest } = vi.hoisted(() => ({ postRequest: vi.fn(), toDevtoolsRequest: vi.fn() }))

vi.mock('#imports', () => ({ defineNuxtPlugin: (plugin: unknown) => plugin }))

vi.mock('#src/runtime/utils/devtools', () => ({
  DEVTOOLS_EVENT: 'shopify:devtools:request',
  DEVTOOLS_ANALYTICS_EVENT: 'shopify:devtools:analytics',
  DEVTOOLS_CONSENT_EVENT: 'shopify:devtools:consent',
  postRequest,
  toDevtoolsRequest,
}))

type Destination = { name: string, setup: (context: { subscribe: (event: string, callback: (payload: object) => void) => void }) => void }

const plugin = (await import('#src/runtime/plugins/devtools.client')).default as unknown as { setup: (nuxtApp: unknown) => void }

const listeners: Array<[string, EventListenerOrEventListenerObject]> = []

afterEach(() => {
  for (const [type, listener] of listeners.splice(0)) document.removeEventListener(type, listener)

  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function setUp(shopify?: object) {
  const hooks: Record<string, (params?: unknown) => void> = {}
  const hot = { send: vi.fn() }
  const addEventListener = document.addEventListener.bind(document)

  vi.stubGlobal('__NUXT_HOT__', hot)
  vi.stubGlobal('Shopify', shopify)

  vi.spyOn(document, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
    listeners.push([type, listener])
    addEventListener(type, listener)
  })

  plugin.setup({ hook: (hookName: string, hook: (params?: unknown) => void) => void (hooks[hookName] = hook) })

  return { hooks, hot }
}

function createBus() {
  const addDestination = vi.fn<(destination: Destination) => () => void>()
  const subscribe = vi.fn<(event: string, callback: (payload: object) => void) => void>()

  const receive = (event: string, payload: object) => subscribe.mock.calls.find(([name]) => name === event)![1](payload)

  return { bus: { addDestination }, addDestination, subscribe, receive }
}

describe('devtools client plugin', () => {
  it.each([
    ['shopify:storefront:client:response', 'storefront'],
    ['shopify:customer-account:client:response', 'customer-account'],
  ])('sends every `%s` in the browser to the DevTools panel over the dev server, with the page it was sent from', (name, client) => {
    const request = { client, source: 'browser' }

    const { hooks, hot } = setUp()

    toDevtoolsRequest.mockReturnValue(request)

    window.history.pushState({}, '', '/products/shirt?variant=1')

    const params = { operation: 'query Shop { shop { name } }', response: {}, duration: 1 }

    hooks[name]!(params)

    expect(toDevtoolsRequest).toHaveBeenLastCalledWith(client, 'browser', params, '/products/shirt?variant=1')
    expect(hot.send).toHaveBeenCalledExactlyOnceWith('shopify:devtools:request', request)
    expect(postRequest).not.toHaveBeenCalled()
    expect(Object.keys(hooks).sort()).toStrictEqual(['shopify:analytics:ready', 'shopify:customer-account:client:response', 'shopify:storefront:client:response'])
  })

  it('adds a destination to Shopify\'s analytics bus once analytics is ready, and sends every standard event it receives over the dev server, with the page of the event', () => {
    const { bus, addDestination, subscribe, receive } = createBus()
    const { hooks, hot } = setUp({ analytics: bus })

    hooks['shopify:analytics:ready']!()

    expect(addDestination).toHaveBeenCalledExactlyOnceWith({ name: 'nuxt-devtools', setup: expect.any(Function) })

    addDestination.mock.calls[0]![0].setup({ subscribe })

    expect(subscribe.mock.calls.map(([event]) => event)).toStrictEqual(Object.values(AnalyticsEvent))

    window.history.pushState({}, '', '/cart')

    const payload = { url: 'http://localhost:3005/collections/all?page=2', collection: { id: 'gid://shopify/Collection/1' } }

    receive('collection_viewed', payload)

    expect(hot.send).toHaveBeenLastCalledWith('shopify:devtools:analytics', { event: 'collection_viewed', page: '/collections/all?page=2', payload, time: expect.any(Number) })
  })

  it('sends an event without a URL, such as a cart event, without a page', () => {
    const { bus, addDestination, subscribe, receive } = createBus()
    const { hooks, hot } = setUp({ analytics: bus })

    hooks['shopify:analytics:ready']!()
    addDestination.mock.calls[0]![0].setup({ subscribe })

    receive('cart_updated', { cart: { id: 'gid://shopify/Cart/1' } })

    expect(hot.send).toHaveBeenLastCalledWith('shopify:devtools:analytics', { event: 'cart_updated', page: undefined, payload: { cart: { id: 'gid://shopify/Cart/1' } }, time: expect.any(Number) })
  })

  it('sends the visitor\'s consent once Shopify\'s Customer Privacy API has loaded it, and again when Shopify collects it', () => {
    const consent = { analytics: false, marketing: false }

    const customerPrivacy = {
      consentStatus: 'loading',
      analyticsProcessingAllowed: () => consent.analytics,
      marketingAllowed: () => consent.marketing,
      preferencesProcessingAllowed: () => true,
      saleOfDataAllowed: () => false,
    }

    const { hooks, hot } = setUp({ analytics: createBus().bus, customerPrivacy })

    hooks['shopify:analytics:ready']!()

    customerPrivacy.consentStatus = 'loaded'

    document.dispatchEvent(new Event('consentTrackingApiLoaded'))

    consent.analytics = true
    consent.marketing = true

    document.dispatchEvent(new Event('visitorConsentCollected'))

    expect(hot.send.mock.calls).toStrictEqual([
      ['shopify:devtools:consent', { loaded: false }],
      ['shopify:devtools:consent', { loaded: true, analytics: false, marketing: false, preferences: true, saleOfData: false }],
      ['shopify:devtools:consent', { loaded: true, analytics: true, marketing: true, preferences: true, saleOfData: false }],
    ])
  })

  it('sends the visitor\'s consent right away when Shopify loaded it before analytics was ready', () => {
    const customerPrivacy = {
      consentStatus: 'loaded',
      analyticsProcessingAllowed: () => true,
      marketingAllowed: () => false,
      preferencesProcessingAllowed: () => false,
      saleOfDataAllowed: () => true,
    }

    const { hooks, hot } = setUp({ analytics: createBus().bus, customerPrivacy })

    hooks['shopify:analytics:ready']!()

    expect(hot.send).toHaveBeenCalledExactlyOnceWith('shopify:devtools:consent', { loaded: true, analytics: true, marketing: false, preferences: false, saleOfData: true })
  })
})
