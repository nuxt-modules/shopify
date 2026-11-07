import { describe, expect, it, vi } from 'vitest'

const addServerHandler = vi.fn()
const extendRouteRules = vi.fn()

vi.mock('@nuxt/kit', () => ({ addServerHandler, extendRouteRules }))

const { addUncachedServerHandler } = await import('#src/utils/routes')

describe('addUncachedServerHandler', () => {
  it('registers the handler and keeps every route rule cache off it, even under a catch-all rule', () => {
    const handler = { method: 'post' as const, route: '/account/customer/api/:version/graphql', handler: './proxy' }

    addUncachedServerHandler(handler)

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith(handler)
    expect(extendRouteRules).toHaveBeenCalledExactlyOnceWith('/account/customer/api/:version/graphql', { cache: false, swr: false, isr: false }, { override: true })
  })
})
