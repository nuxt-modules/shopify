import type { PrepareLoginUrlOptions } from '@shopify/hydrogen/customer-account'

import type { ShopifyCustomerAccountSession } from '../../../module'

import { CUSTOMER_ACCOUNT_LOGIN_PATH, CUSTOMER_ACCOUNT_LOGOUT_PATH } from '@shopify/hydrogen/customer-account'
import { computed } from 'vue'
import { withQuery } from 'ufo'
import { createError, navigateTo, useRequestEvent, useRuntimeConfig, useState } from '#imports'

import { CUSTOMER_ACCOUNT_SESSION_ROUTE } from '../../utils/session'

type LoginOptions = Omit<PrepareLoginUrlOptions, 'origin' | 'countryCode'>

type LogoutOptions = {
  returnTo?: string
}

const emptySession = (): ShopifyCustomerAccountSession => ({ isLoggedIn: false })

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

  const session = useState<ShopifyCustomerAccountSession>('shopify-customer-account-session', emptySession)
  const isReady = useState<boolean>('shopify-customer-account-session-ready', () => false)

  const requestEvent = import.meta.server ? useRequestEvent() : undefined

  const readSession = (): Promise<ShopifyCustomerAccountSession> => {
    if (!import.meta.server) {
      return $fetch<ShopifyCustomerAccountSession>(CUSTOMER_ACCOUNT_SESSION_ROUTE, {
        headers: { accept: 'application/json' },
      })
    }

    const serverContext = requestEvent?.context.shopifyCustomerAccount

    return requestEvent && serverContext ? serverContext.getSession(requestEvent) : Promise.resolve(emptySession())
  }

  const fetch = async () => {
    session.value = await readSession().catch(() => emptySession())

    isReady.value = true
  }

  const login = (options: LoginOptions = {}) => navigateTo(withQuery(CUSTOMER_ACCOUNT_LOGIN_PATH, {
    return_to: options.returnTo,
    locale: options.locale,
    login_hint: options.loginHint,
    login_hint_mode: options.loginHintMode,
    acr_values: options.acrValues,
  }), { external: true })

  const logout = (options: LogoutOptions = {}) => {
    if (import.meta.server) return

    const form = document.createElement('form')

    form.method = 'post'
    form.action = withQuery(CUSTOMER_ACCOUNT_LOGOUT_PATH, { return_to: options.returnTo })

    document.body.append(form)

    form.submit()
  }

  return {
    isLoggedIn: computed(() => session.value.isLoggedIn),
    isReady,
    fetch,
    login,
    logout,
  }
}
