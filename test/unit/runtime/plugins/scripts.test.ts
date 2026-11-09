import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

type HeadInput = { script: Array<{ id?: string, innerHTML?: string }> }

type Analytics = Record<string, unknown>

const state = new Map<string, ReturnType<typeof ref>>()
const heads: HeadInput[] = []
const request = vi.fn()
const initializeShopifyScripts = vi.fn((_options: Record<string, unknown>) => Promise.resolve())

let nuxtApp: { hook: ReturnType<typeof vi.fn>, callHook: ReturnType<typeof vi.fn>, runWithContext: (run: () => unknown) => unknown }
let analytics: Analytics | false
let requestEvent: { context: Record<string, unknown> } | undefined

vi.mock('@shopify/hydrogen', async () => ({
  ...await vi.importActual<Record<string, unknown>>('@shopify/hydrogen'),
  initializeShopifyScripts,
}))

vi.mock('#imports', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  useNuxtApp: () => nuxtApp,
  useHead: (input: HeadInput) => void heads.push(input),
  useRequestEvent: () => requestEvent,
  useRouter: () => ({ currentRoute: ref({ fullPath: '/' }), afterEach: vi.fn(), push: vi.fn() }),
  useRuntimeConfig: () => ({ public: { _shopify: { name: 'my-shop', clients: { storefront: {} }, analytics, routeTemplates: ROUTE_TEMPLATES } } }),
  useState: (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))

    return state.get(key)
  },
}))

vi.mock('#src/runtime/composables/storefront/client', () => ({ useStorefront: () => ({ request }) }))

const { createShopResolver } = await import('#src/runtime/utils/shop')

function serverRequest(context: Record<string, unknown> = {}) {
  const resolve = createShopResolver({ name: 'my-shop', analytics } as never, () => ({ request }) as never)

  return { context: { ...context, shopifyScripts: (event: { context: { shopifyMarket?: never } }) => resolve(event.context.shopifyMarket) } }
}

const ROUTE_TEMPLATES = { product: '/product/:productHandle' }

const SHOP = { shopId: 'gid://shopify/Shop/1', storefrontId: '0', myshopifyDomain: 'my-shop.myshopify.com' }

const market = (country: string, language: string, currency: string) => ({
  data: {
    shop: { id: SHOP.shopId },
    localization: { country: { isoCode: country, currency: { isoCode: currency } }, language: { isoCode: language } },
  },
})

async function startPlugin() {
  const plugin = (await import('#src/runtime/plugins/scripts')).default as unknown as { setup: () => Promise<void> }

  await plugin.setup()
}

async function mount(bus: Record<string, unknown> = { publish: vi.fn() }) {
  vi.stubGlobal('window', { Shopify: { analytics: bus } })

  const [, mounted] = nuxtApp.hook.mock.calls.find(([name]) => name === 'app:mounted') as [string, () => Promise<void>]

  await mounted()

  return bus
}

const bootstrapOf = (input: HeadInput) => input.script.find(script => script.id === 'shopify-global-bootstrap')?.innerHTML ?? ''

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  state.clear()
  heads.length = 0
  requestEvent = undefined

  analytics = { autoPageView: false, consent: { mode: 'no-banner' } }
  nuxtApp = { hook: vi.fn(), callHook: vi.fn(), runWithContext: (run: () => unknown) => run() }

  request.mockImplementation((_query: string, { variables }: { variables: { country?: string } }) =>
    Promise.resolve(variables.country === 'CA' ? market('CA', 'FR', 'CAD') : market('DE', 'DE', 'EUR')))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('on the server', () => {
  beforeEach(() => {
    vi.stubGlobal('__NUXT_SERVER__', true)
  })

  it('renders the scripts in the market the app set for the request', async () => {
    requestEvent = serverRequest({ shopifyMarket: { country: 'CA', language: 'FR' } })

    await startPlugin()

    expect(heads).toHaveLength(1)
    expect(bootstrapOf(heads[0]!)).toContain('"country":"CA"')
    expect(bootstrapOf(heads[0]!)).toContain('"active":"CAD"')
    expect(request).toHaveBeenCalledWith(expect.any(String), { variables: { country: 'CA', language: 'FR' } })
  })

  it('renders the scripts in the shop\'s default market without one from the app', async () => {
    requestEvent = serverRequest()

    await startPlugin()

    expect(bootstrapOf(heads[0]!)).toContain('"country":"DE"')
    expect(state.get('shopify-scripts')!.value).toMatchObject({ shop: SHOP, shopifyAnalytics: true, i18n: { country: 'DE', language: 'DE', currency: 'EUR' } })
  })

  it('renders Shopify\'s scripts without its analytics while analytics is off, for Hydrogen\'s cart', async () => {
    analytics = false
    requestEvent = serverRequest()

    await startPlugin()

    const ids = heads[0]!.script.map(script => script.id)

    expect(ids).toEqual(expect.arrayContaining(['shopify-global-bootstrap', 'shopify-standard-actions', 'shopify-analytics-bus']))
    expect(ids).not.toContain('shopify-storefront-analytics')
    expect(ids).not.toContain('shopify-perfkit')
  })
})

describe('in the browser', () => {
  beforeEach(() => {
    vi.stubGlobal('document', new EventTarget())
  })

  it('starts Shopify\'s scripts without analytics, with no ready hook and no page views', async () => {
    analytics = false

    state.set('shopify-scripts', ref({ shop: SHOP, shopifyAnalytics: false }))

    await startPlugin()

    const bus = await mount()

    expect(initializeShopifyScripts).toHaveBeenCalledOnce()
    expect(nuxtApp.callHook).not.toHaveBeenCalledWith('shopify:analytics:ready', expect.anything())
    expect(bus.publish).not.toHaveBeenCalled()
  })

  it('starts the scripts the server rendered once the app is mounted, without looking the shop up again', async () => {
    state.set('shopify-scripts', ref({ shop: SHOP, shopifyAnalytics: true, i18n: { country: 'CA', language: 'FR', currency: 'CAD' } }))

    await startPlugin()

    expect(initializeShopifyScripts).not.toHaveBeenCalled()

    await mount()

    expect(heads).toHaveLength(0)
    expect(request).not.toHaveBeenCalled()
    expect(initializeShopifyScripts).toHaveBeenCalledExactlyOnceWith({ consent: { mode: 'no-banner' }, navigate: expect.any(Function), routes: ROUTE_TEMPLATES })
    expect(nuxtApp.callHook).toHaveBeenCalledWith('shopify:analytics:ready', { shop: SHOP, shopifyAnalytics: true, i18n: { country: 'CA', language: 'FR', currency: 'CAD' } })
  })

  it('renders the scripts itself when the server did not', async () => {
    await startPlugin()
    await mount()

    expect(heads).toHaveLength(1)
    expect(bootstrapOf(heads[0]!)).toContain('"country":"DE"')
    expect(initializeShopifyScripts).toHaveBeenCalledOnce()
  })

  it('publishes a page view for the landing page through Shopify\'s bus', async () => {
    analytics = { autoPageView: true, consent: { mode: 'no-banner' } }

    state.set('shopify-scripts', ref({ shop: SHOP, shopifyAnalytics: true }))

    await startPlugin()

    const bus = await mount()

    expect(bus.publish).toHaveBeenCalledExactlyOnceWith('page_viewed')
  })

  it('holds the events of a custom banner until Shopify reports the visitor\'s consent', async () => {
    analytics = { autoPageView: false, consent: { mode: 'custom-banner' } }

    state.set('shopify-scripts', ref({ shop: SHOP, shopifyAnalytics: true }))

    await startPlugin()
    await mount()

    const { consent } = initializeShopifyScripts.mock.calls[0]![0] as { consent: { mode: string, setup: () => Promise<void> } }

    let released = false

    void consent.setup().then(() => released = true)

    await Promise.resolve()

    expect(consent.mode).toBe('custom-banner')
    expect(released).toBe(false)

    document.dispatchEvent(new Event('visitorConsentCollected'))

    await vi.waitFor(() => expect(released).toBe(true))
  })

  it('releases the events of a custom banner at once when the visitor\'s consent is already saved', async () => {
    analytics = { autoPageView: false, consent: { mode: 'custom-banner' } }

    state.set('shopify-scripts', ref({ shop: SHOP, shopifyAnalytics: true }))

    await startPlugin()

    const bus = { publish: vi.fn() }

    vi.stubGlobal('window', { Shopify: { analytics: bus, customerPrivacy: { currentVisitorConsent: () => ({ analytics: 'yes', marketing: 'no', preferences: '', sale_of_data: '' }) } } })

    const [, mounted] = nuxtApp.hook.mock.calls.find(([name]) => name === 'app:mounted') as [string, () => Promise<void>]

    await mounted()

    const { consent } = initializeShopifyScripts.mock.calls[0]![0] as { consent: { setup: () => Promise<void> } }

    await expect(consent.setup()).resolves.toBeUndefined()
  })
})
