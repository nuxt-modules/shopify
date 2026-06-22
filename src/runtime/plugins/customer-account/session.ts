import { defineNuxtPlugin } from '#app'

import { useCustomerAccountSession } from '../../composables/customer-account/session'

export default defineNuxtPlugin({
  name: 'shopify:customer-account-session',
  enforce: 'pre',

  async setup() {
    if (import.meta.server && import.meta.prerender) return

    const { fetch, ready } = useCustomerAccountSession()

    if (!ready.value) {
      await fetch()
    }
  },
})
