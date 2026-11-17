import type { PrepareLoginUrlOptions } from '@shopify/hydrogen/customer-account'

import type { ShopifyCustomerAccountSession } from '../../../module'

import { CUSTOMER_ACCOUNT_LOGIN_PATH, CUSTOMER_ACCOUNT_LOGOUT_PATH } from '@shopify/hydrogen/customer-account'
import { computed } from 'vue'
import { withQuery } from 'ufo'
import { createError, navigateTo, useRequestEvent, useRuntimeConfig, useState } from '#imports'

import { CUSTOMER_ACCOUNT_DISABLED_MESSAGE, CUSTOMER_ACCOUNT_SESSION_ROUTE, isCustomerAccountEnabled } from '../../utils/session'

type LoginOptions = Omit<PrepareLoginUrlOptions, 'origin' | 'countryCode'>

type LogoutOptions = {
  returnTo?: string
}

const emptySession = (): ShopifyCustomerAccountSession => ({ isLoggedIn: false })

const disabledError = () => createError({ status: 404, statusText: 'Not Found', message: CUSTOMER_ACCOUNT_DISABLED_MESSAGE })

/**
 * Provides the customer account session state and the login and logout actions.
 *
 * @returns reactive session state with `isEnabled`, `login`, `logout` and `fetch`
 */
export function useCustomerAccountSession() {
  const { _shopify } = useRuntimeConfig().public

  const customerAccount = _shopify?.clients?.customerAccount

  if (!customerAccount) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Customer account client is not configured' })
  }

  const isEnabled = computed(() => isCustomerAccountEnabled(_shopify))

  const session = useState<ShopifyCustomerAccountSession>('shopify-customer-account-session', emptySession)
  const isReady = useState<boolean>('shopify-customer-account-session-ready', () => false)

  const requestEvent = import.meta.server ? useRequestEvent() : undefined

  const readSession = (): Promise<ShopifyCustomerAccountSession | null> => {
    if (!import.meta.server) {
      return $fetch<ShopifyCustomerAccountSession>(CUSTOMER_ACCOUNT_SESSION_ROUTE, {
        headers: { accept: 'application/json' },
      })
    }

    const serverContext = requestEvent?.context._shopify?.customerAccount

    return requestEvent && serverContext ? serverContext.getSession(requestEvent) : Promise.resolve(emptySession())
  }

  const fetch = async () => {
    const value = isEnabled.value ? await readSession().catch(emptySession) : emptySession()

    if (!value) return

    session.value = value
    isReady.value = true
  }

  const login = (options: LoginOptions = {}) => {
    if (!isEnabled.value) throw disabledError()

    return navigateTo(withQuery(CUSTOMER_ACCOUNT_LOGIN_PATH, {
      return_to: options.returnTo,
      locale: options.locale,
      login_hint: options.loginHint,
      login_hint_mode: options.loginHintMode,
      acr_values: options.acrValues,
    }), { external: true })
  }

  const logout = (options: LogoutOptions = {}) => {
    if (!isEnabled.value) throw disabledError()

    if (import.meta.server) return

    const form = document.createElement('form')

    form.method = 'post'
    form.action = withQuery(CUSTOMER_ACCOUNT_LOGOUT_PATH, { return_to: options.returnTo })

    document.body.append(form)

    form.submit()
  }

  return {
    isEnabled,
    isLoggedIn: computed(() => session.value.isLoggedIn),
    isReady,
    fetch,
    login,
    logout,
  }
}
