import { createError, defineEventHandler, getRequestHeader, getRequestURL, sendRedirect } from 'h3'
import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { joinURL } from 'ufo'

import { createStoreDomain } from '../../../../utils/client'
import { clearCustomerAccountSession, getCustomerAccountSession, getCustomerAccountTokens } from '../../../utils/customer-account/session'
import { buildLogoutURL, getOpenIdConfiguration } from '../../../utils/customer-account/oauth'

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  const customerAccount = _shopify?.clients?.customerAccount

  if (!_shopify || !customerAccount) {
    throw createError({ statusCode: 500, statusMessage: '[shopify] Customer account client is not configured' })
  }

  const secFetchSite = getRequestHeader(event, 'sec-fetch-site')

  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    throw createError({ statusCode: 403, statusMessage: '[shopify] Cross-site logout is not allowed' })
  }

  const { user } = await getCustomerAccountSession(event)
  const tokens = await getCustomerAccountTokens(event)
  const idToken = tokens?.idToken

  await useNitroApp().hooks.callHook('customer-account:auth:logout', { user, idToken })

  await clearCustomerAccountSession(event)

  if (!import.meta.dev && idToken) {
    const configuration = await getOpenIdConfiguration(createStoreDomain(_shopify.name))

    const requestURL = getRequestURL(event)
    const postLogoutRedirectUri = joinURL(requestURL.origin, customerAccount.logoutRedirectURL)

    return sendRedirect(event, buildLogoutURL(configuration, {
      idToken,
      postLogoutRedirectUri,
    }))
  }

  return sendRedirect(event, customerAccount.logoutRedirectURL)
})
