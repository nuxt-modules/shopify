import type { ShopAnalytics } from '../../../module'

import { nextTick } from 'vue'

export interface PageViewRouter {
  currentRoute: { value: { fullPath: string } }
  afterEach: (guard: () => void) => unknown
}

export interface PageViewTrackerOptions {
  router: PageViewRouter
  shop: () => ShopAnalytics | null
  publish: (url: string) => void
}

export function createPageViewTracker({ router, shop, publish }: PageViewTrackerOptions) {
  let lastKey: string | undefined

  const track = () => {
    if (!shop()?.shopId) return

    const { fullPath } = router.currentRoute.value
    const hashIndex = fullPath.indexOf('#')
    const key = hashIndex === -1 ? fullPath : fullPath.slice(0, hashIndex)

    if (key === lastKey) return

    lastKey = key

    publish(window.location.href)
  }

  router.afterEach(() => void nextTick(track))

  return track
}
