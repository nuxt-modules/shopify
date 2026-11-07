import type { useRouter } from '#imports'

import { nextTick } from 'vue'

export function trackPageViews(router: Pick<ReturnType<typeof useRouter>, 'currentRoute' | 'afterEach'>, publish: () => void) {
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
