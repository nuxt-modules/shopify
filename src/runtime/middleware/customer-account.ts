import { defineNuxtRouteMiddleware, useNuxtApp } from '#app'

import { useCustomerAccountSession } from '../composables/customer-account/session'

export default defineNuxtRouteMiddleware(async (to) => {
  const nuxtApp = useNuxtApp()

  const { isLoggedIn, isReady, fetch, login } = useCustomerAccountSession()

  if (!isReady.value || (import.meta.client && !nuxtApp.isHydrating)) {
    await fetch()
  }

  if (isReady.value && !isLoggedIn.value) {
    return login({ returnTo: to.fullPath })
  }
})
