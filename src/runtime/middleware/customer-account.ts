import { defineNuxtRouteMiddleware } from '#app'

import { useCustomerAccountSession } from '../composables/customer-account/session'

export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoggedIn, ready, fetch, login } = useCustomerAccountSession()

  if (import.meta.client || !ready.value) {
    await fetch()
  }

  if (!isLoggedIn.value) {
    return login({ returnTo: to.fullPath })
  }
})
