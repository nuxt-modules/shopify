import { createError, defineEventHandler, getRequestURL, sendRedirect } from 'h3'
import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { joinURL } from 'ufo'

import { assertSameSite } from '../../../utils/csrf'
import { createStoreDomain } from '../../../../utils/clients/transport'
import { clearCustomerAccountSession, getCustomerAccountSession, getCustomerAccountTokens } from '../../../utils/customer-account/session'
import { buildLogoutURL, getOpenIdConfiguration } from '../../../../utils/clients/customer-account/auth'

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  const customerAccount = _shopify?.clients?.customerAccount

  if (!_shopify || !customerAccount) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Customer account client is not configured' })
  }

  assertSameSite(event, { allowNavigation: true })

  const { user } = await getCustomerAccountSession(event)
  const tokens = await getCustomerAccountTokens(event)
  const idToken = tokens?.idToken

  await useNitroApp().hooks.callHook('customer-account:auth:logout', { user, idToken })

  await clearCustomerAccountSession(event)

  if (!import.meta.dev && idToken) {
    const configuration = await getOpenIdConfiguration(createStoreDomain(_shopify.name))

    const requestURL = getRequestURL(event)
    const postLogoutRedirectUri = joinURL(requestURL.origin, customerAccount.afterLogout)

    return sendRedirect(event, buildLogoutURL(configuration, {
      idToken,
      postLogoutRedirectUri,
    }))
  }

  return sendRedirect(event, customerAccount.afterLogout)
})
