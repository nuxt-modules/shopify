import { abortNavigation, createError, defineNuxtRouteMiddleware, useNuxtApp } from '#app'

import { useCustomerAccountSession } from '../composables/customer-account/session'

export default defineNuxtRouteMiddleware(async (to) => {
  const nuxtApp = useNuxtApp()

  const { isEnabled, isLoggedIn, isReady, fetch, login } = useCustomerAccountSession()

  // The page is shown to customers, so it gets a plain 404 rather than the configuration hint
  if (!isEnabled.value) {
    return abortNavigation(createError({ status: 404, statusText: 'Page Not Found', fatal: true }))
  }

  if (!isReady.value || (import.meta.client && !nuxtApp.isHydrating)) {
    await fetch()
  }

  if (isReady.value && !isLoggedIn.value) {
    return login({ returnTo: to.fullPath })
  }
})
