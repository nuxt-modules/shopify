import type { CustomerAccountSession, CustomerAccountUser } from '../../server/utils/customer-account/session'

import { computed } from 'vue'
import { joinURL, withLeadingSlash } from 'ufo'
import { createError, navigateTo, useRequestFetch, useRuntimeConfig, useState } from '#imports'

const emptySession = (): CustomerAccountSession => ({
  loggedIn: false,
  user: null,
  loggedInAt: null,
})

export function useCustomerAccountSession() {
  const { _shopify } = useRuntimeConfig().public

  const customerAccount = _shopify?.clients?.customerAccount

  if (!customerAccount) {
    throw createError({ statusCode: 500, message: '[shopify] Customer account client is not configured' })
  }

  const session = useState<CustomerAccountSession>('shopify-customer-account-session', emptySession)
  const ready = useState<boolean>('shopify-customer-account-session-ready', () => false)

  const fetch = async () => {
    session.value = await useRequestFetch()<CustomerAccountSession>(withLeadingSlash(customerAccount.sessionURL), {
      headers: { accept: 'application/json' },
    }).catch(() => emptySession())

    ready.value = true
  }

  const login = () => {
    let url = withLeadingSlash(customerAccount.loginURL)

    if (import.meta.dev && customerAccount.dev.tunnelURL) {
      url = joinURL(customerAccount.dev.tunnelURL, customerAccount.loginURL)
    }

    return navigateTo(url, { external: true })
  }

  const logout = () => navigateTo(withLeadingSlash(customerAccount.logoutURL), { external: true })

  return {
    user: computed((): CustomerAccountUser | null => session.value.user),
    isLoggedIn: computed(() => session.value.loggedIn),
    loggedInAt: computed(() => session.value.loggedInAt),
    ready,
    fetch,
    login,
    logout,
  }
}
