import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { trackPageViews } from '#src/runtime/utils/analytics/page-view'

type Router = Parameters<typeof trackPageViews>[0]

function setup(fullPath = '/') {
  const guards: Array<() => void> = []
  const currentRoute = { value: { fullPath } }
  const publish = vi.fn()

  const router = {
    currentRoute,
    afterEach: (guard: () => void) => guards.push(guard),
  } as unknown as Router

  trackPageViews(router, publish)

  return {
    publish,
    navigate(to: string) {
      currentRoute.value = { fullPath: to }
      guards.forEach(guard => guard())

      return nextTick()
    },
  }
}

describe('trackPageViews', () => {
  it('publishes the landing page right away and a view for each navigation to a new path or query', async () => {
    const { publish, navigate } = setup()

    expect(publish).toHaveBeenCalledOnce()

    await navigate('/search?q=shoes')
    await navigate('/search?q=boots')

    expect(publish).toHaveBeenCalledTimes(3)
  })

  it('does not report a second view for a hash-only change', async () => {
    const { publish, navigate } = setup()

    await navigate('/products')
    await navigate('/products#reviews')

    expect(publish).toHaveBeenCalledTimes(2)
  })
})
