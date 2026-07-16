import { createError, defineEventHandler, deleteCookie, getCookie, getQuery, getRequestURL, sendRedirect, setCookie } from 'h3'
import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { joinURL, withQuery } from 'ufo'

import { createStoreDomain } from '../../../../utils/client'
import { createLogger } from '../../../utils/log'
import { createBridgeNonce } from '../../../utils/customer-account/bridge'
import { setCustomerAccountSession } from '../../../utils/customer-account/session'
import {
  buildAuthorizationParams,
  buildAuthorizationURL,
  exchangeAuthorizationCode,
  fetchCustomerIdentity,
  generateCodeChallenge,
  generateRandomToken,
  getOpenIdConfiguration,
} from '../../../../utils/customer-account/oauth'

const STATE_COOKIE = 'shopify-customer-account-state'
const VERIFIER_COOKIE = 'shopify-customer-account-verifier'

const transientCookieOptions: Parameters<typeof setCookie>[3] = {
  httpOnly: true,
  secure: !import.meta.dev,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 10,
}

function localConsumeUrl(bridgeURL: string, nonce: string) {
  const url = new URL(bridgeURL.includes('://') ? bridgeURL : joinURL('http://localhost:3000', bridgeURL))

  if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw createError({ statusCode: 500, statusMessage: '[shopify] Invalid dev bridge URL for customer account API' })
  }

  url.searchParams.set('nonce', nonce)

  return url.toString()
}

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  const customerAccount = _shopify?.clients?.customerAccount

  if (!_shopify || !customerAccount?.clientId || !customerAccount.apiUrl) {
    throw createError({ statusCode: 500, statusMessage: '[shopify] Customer account client is not configured' })
  }

  const requestURL = getRequestURL(event)
  const redirectUri = requestURL.origin + requestURL.pathname

  const configuration = await getOpenIdConfiguration(createStoreDomain(_shopify.name))

  const nitroApp = useNitroApp()

  const query = getQuery(event)

  // First leg: no authorization code yet, so we start the OAuth flow.
  if (!query.code) {
    createLogger().debug('Starting customer account OAuth flow')

    const state = generateRandomToken(16)

    setCookie(event, STATE_COOKIE, state, transientCookieOptions)

    let codeChallenge: string | undefined

    if (!customerAccount.clientSecret) {
      const codeVerifier = generateRandomToken(32)

      setCookie(event, VERIFIER_COOKIE, codeVerifier, transientCookieOptions)

      codeChallenge = await generateCodeChallenge(codeVerifier)
    }

    const params = buildAuthorizationParams({
      clientId: customerAccount.clientId,
      redirectUri,
      scope: customerAccount.scope,
      state,
      codeChallenge,
    })

    await nitroApp.hooks.callHook('customer-account:auth:authorize', { params })

    return sendRedirect(event, buildAuthorizationURL(configuration, params))
  }

  // Second leg: Shopify redirected back with an authorization code.
  const expectedState = getCookie(event, STATE_COOKIE)
  const codeVerifier = getCookie(event, VERIFIER_COOKIE)

  deleteCookie(event, STATE_COOKIE)
  deleteCookie(event, VERIFIER_COOKIE)

  if (!expectedState || query.state !== expectedState) {
    throw createError({ statusCode: 403, statusMessage: '[shopify] Invalid OAuth state' })
  }

  if (!customerAccount.clientSecret && !codeVerifier) {
    throw createError({ statusCode: 400, statusMessage: '[shopify] Missing PKCE verifier' })
  }

  try {
    createLogger().debug('Exchanging customer account authorization code for tokens')

    const tokens = await exchangeAuthorizationCode(configuration, {
      clientId: customerAccount.clientId,
      clientSecret: customerAccount.clientSecret,
      redirectUri,
      code: String(query.code),
      codeVerifier,
    })

    const user = await fetchCustomerIdentity(customerAccount.apiUrl, tokens.access_token)

    const tokenSet = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: Date.now() + (tokens.expires_in ?? 7200) * 1000,
    }

    await nitroApp.hooks.callHook('customer-account:auth:success', { user, tokens: tokenSet })

    const tunnelURL = customerAccount.dev?.tunnelURL
    const bridgeURL = customerAccount.dev?.bridgeURL
    const isTunnelHost = import.meta.dev && tunnelURL?.length && bridgeURL?.length && requestURL.toString().includes(tunnelURL)

    // Dev bridge: hand the session off to localhost instead of persisting it on the tunnel host.
    if (isTunnelHost) {
      const nonce = createBridgeNonce({ user, tokens: tokenSet })

      return sendRedirect(event, localConsumeUrl(bridgeURL, nonce))
    }

    await setCustomerAccountSession(event, {
      user,
      tokens: tokenSet,
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, customerAccount.redirectURL)
  }
  catch (error) {
    createLogger().error('Customer account OAuth flow failed:', error)

    await nitroApp.hooks.callHook('customer-account:auth:error', { error })

    return sendRedirect(event, withQuery(customerAccount.redirectURL, { customer_account_error: '1' }))
  }
})
