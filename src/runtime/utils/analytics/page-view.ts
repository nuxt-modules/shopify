import type { useRouter } from '#imports'

import { nextTick } from 'vue'

type Router = ReturnType<typeof useRouter>

export function trackPageViews(router: Pick<Router, 'currentRoute' | 'afterEach'>, publish: () => void) {
  let lastPage: string | undefined

  const track = () => {
    const [page] = router.currentRoute.value.fullPath.split('#')

    if (page === lastPage) return

    lastPage = page

    publish()
  }

  router.afterEach(() => void nextTick(track))

  track()
}
