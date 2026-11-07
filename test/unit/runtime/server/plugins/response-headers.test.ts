import { createShopifyRequestContext } from '@shopify/hydrogen'
import { describe, expect, it, vi } from 'vitest'

import { createTestEvent, getResponseHeader } from '#test/helpers/event'

vi.mock('nitropack/runtime', () => ({ defineNitroPlugin: (plugin: unknown) => plugin }))

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({}) }))

const plugin = (await import('#src/runtime/server/plugins/response-headers')).default as unknown as (nitroApp: unknown) => void

describe('response headers plugin', () => {
  it('keeps a personalized page out of shared caches before Nitro sends it, whatever else Nitro passes to the hook', async () => {
    const hooks: Record<string, (event: unknown, response: unknown) => unknown> = {}

    plugin({ hooks: { hook: (name: string, hook: (event: unknown, response: unknown) => unknown) => void (hooks[name] = hook) } })

    const event = createTestEvent({ path: '/account', headers: { host: 'shop.test' } })

    event.node.res.setHeader('cache-control', 'public, s-maxage=60')
    event.node.res.setHeader('cdn-cache-control', 'max-age=60')

    const requestContext = createShopifyRequestContext({ request: new Request('https://shop.test/account'), i18n: { country: 'US', language: 'EN' } })

    requestContext.markResponseAsPersonalized('customer-session')

    event.context.shopifyRequestContext = requestContext

    await hooks.beforeResponse!(event, { body: '<html></html>' })

    expect(getResponseHeader(event, 'cache-control')).toBe('private, no-store, max-age=0, must-revalidate')
    expect(event.node.res.hasHeader('cdn-cache-control')).toBe(false)
  })
})
