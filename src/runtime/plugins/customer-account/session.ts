import { defineNuxtPlugin } from '#app'

import { useCustomerAccountSession } from '../../composables/customer-account/session'

export default defineNuxtPlugin({
  name: 'shopify:customer-account:session',
  enforce: 'pre',

  async setup(nuxtApp) {
    if (import.meta.server && import.meta.prerender) return

    const { fetch, isReady } = useCustomerAccountSession()

    if (isReady.value) return

    if (import.meta.client && nuxtApp.payload.serverRendered) {
      nuxtApp.hook('app:mounted', fetch)

      return
    }

    await fetch()
  },
})
