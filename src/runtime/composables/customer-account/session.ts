import type { CustomerAccountSession, CustomerAccountUser } from '../../server/utils/customer-account/session'

import { computed } from 'vue'
import { joinURL, withLeadingSlash, withQuery } from 'ufo'
import { createError, navigateTo, useRequestFetch, useRequestHeaders, useRuntimeConfig, useState } from '#imports'

import { SESSION_DEFAULT_NAME } from '../../utils/session'

type LoginOptions = {
  /** Pre-fills the customer's email address on Shopify's login screen. */
  loginHint?: string
  /** Set to `submit` to skip the email step when `loginHint` is given. */
  loginHintMode?: string
  /** Language of Shopify's login screen, e.g. `de` or `pt-BR`. */
  locale?: string
  /** Country context for the login screen, e.g. `DE`. */
  countryCode?: string
  /** Authentication context class values, e.g. for B2B flows. */
  acrValues?: string
  /** Path to return to after login, defaulting to the configured `afterLogin`. */
  returnTo?: string
}

const emptySession = (): CustomerAccountSession => ({
  loggedIn: false,
  user: null,
  loggedInAt: null,
})

/**
 * Provides the customer account session state and the login and logout actions.
 *
 * @returns reactive session state with `login`, `logout` and `fetch`
 */
export function useCustomerAccountSession() {
  const { _shopify } = useRuntimeConfig().public

  const customerAccount = _shopify?.clients?.customerAccount

  if (!customerAccount) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Customer account client is not configured' })
  }

  const session = useState<CustomerAccountSession>('shopify-customer-account-session', emptySession)
  const ready = useState<boolean>('shopify-customer-account-session-ready', () => false)

  const cookieName = customerAccount.session?.name || SESSION_DEFAULT_NAME
  const requestCookie = import.meta.client ? undefined : useRequestHeaders(['cookie']).cookie

  const hasSessionCookie = () => {
    if (import.meta.client) return true

    return !!requestCookie?.split(';').some(entry => entry.trimStart().startsWith(`${cookieName}=`))
  }

  const fetch = async () => {
    session.value = hasSessionCookie()
      ? await useRequestFetch()<CustomerAccountSession>(withLeadingSlash(customerAccount.routes.session), {
          headers: { accept: 'application/json' },
        }).catch(() => emptySession())
      : emptySession()

    ready.value = true
  }

  const login = (options?: LoginOptions) => {
    let url = withLeadingSlash(customerAccount.routes.callback)

    if (import.meta.dev && customerAccount.dev.tunnelURL) {
      url = joinURL(customerAccount.dev.tunnelURL, customerAccount.routes.callback)
    }

    url = withQuery(url, {
      ...(options?.loginHint ? { login_hint: options.loginHint } : {}),
      ...(options?.loginHintMode ? { login_hint_mode: options.loginHintMode } : {}),
      ...(options?.locale ? { locale: options.locale } : {}),
      ...(options?.countryCode ? { region_country: options.countryCode } : {}),
      ...(options?.acrValues ? { acr_values: options.acrValues } : {}),
      ...(options?.returnTo ? { return_to: options.returnTo } : {}),
    })

    return navigateTo(url, { external: true })
  }

  const logout = () => navigateTo(withLeadingSlash(customerAccount.routes.logout), { external: true })

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
