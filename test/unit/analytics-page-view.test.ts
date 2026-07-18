// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { createPageViewTracker } from '../../src/runtime/utils/analytics/page-view'

const shop = { shopId: 'gid://shopify/Shop/1', acceptedLanguage: 'EN', currency: 'USD', hydrogenSubchannelId: '0' }

function createRouter(fullPath: string) {
  const guards: Array<() => void> = []
  const currentRoute = { value: { fullPath } }

  return {
    currentRoute,
    afterEach: (guard: () => void) => guards.push(guard),

    navigate(to: string) {
      window.history.pushState({}, '', to)
      currentRoute.value = { fullPath: to }
      guards.forEach(guard => guard())

      return nextTick()
    },
  }
}

function setup({ resolved = true, path = '/' }: { resolved?: boolean, path?: string } = {}) {
  const publish = vi.fn()
  const router = createRouter(path)
  const current = { shop: resolved ? shop : null }
  const track = createPageViewTracker({ router, shop: () => current.shop, publish })

  return { publish, router, track, resolve: () => (current.shop = shop) }
}

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

describe('analytics page views', () => {
  it('publishes nothing until the shop resolves', async () => {
    const { publish, router, track } = setup({ resolved: false })

    track()
    await router.navigate('/products')

    expect(publish).not.toHaveBeenCalled()
  })

  it('publishes the landing page once the shop resolves', async () => {
    const { publish, track } = setup()

    track()

    expect(publish).toHaveBeenCalledOnce()
    expect(publish).toHaveBeenCalledWith(window.location.href)
  })

  it('reports the current page when navigation happened before the shop resolved', async () => {
    const { publish, router, track, resolve } = setup({ resolved: false })

    await router.navigate('/products')
    expect(publish).not.toHaveBeenCalled()

    resolve()
    track()

    expect(publish).toHaveBeenCalledOnce()
    expect(publish).toHaveBeenCalledWith(expect.stringContaining('/products'))
  })

  it('publishes one view per navigation', async () => {
    const { publish, router, track } = setup()

    track()
    await router.navigate('/products')
    await router.navigate('/collections')

    expect(publish).toHaveBeenCalledTimes(3)
  })

  it('does not report a second view for a hash-only change', async () => {
    const { publish, router, track } = setup()

    track()
    await router.navigate('/products')
    await router.navigate('/products#reviews')

    expect(publish).toHaveBeenCalledTimes(2)
  })

  it('reports a view when the query changes', async () => {
    const { publish, router, track } = setup()

    track()
    await router.navigate('/search?q=shoes')
    await router.navigate('/search?q=boots')

    expect(publish).toHaveBeenCalledTimes(3)
  })

  it('does not report the landing page twice when navigation precedes the flush', async () => {
    const { publish, router, track } = setup()

    await router.navigate('/products')
    track()

    expect(publish).toHaveBeenCalledOnce()
  })
})
