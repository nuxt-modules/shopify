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
  getIdTokenNonce,
  getOpenIdConfiguration,
  sanitizeReturnPath,
} from '../../../../utils/customer-account/oauth'

const STATE_COOKIE = 'shopify-customer-account-state'
const VERIFIER_COOKIE = 'shopify-customer-account-verifier'
const NONCE_COOKIE = 'shopify-customer-account-nonce'
const RETURN_TO_COOKIE = 'shopify-customer-account-return-to'

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
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Invalid dev bridge URL for customer account API' })
  }

  url.searchParams.set('nonce', nonce)

  return url.toString()
}

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  const customerAccount = _shopify?.clients?.customerAccount

  if (!_shopify || !customerAccount?.clientId || !customerAccount.apiUrl) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Customer account client is not configured' })
  }

  const requestURL = getRequestURL(event)
  const redirectUri = requestURL.origin + requestURL.pathname

  const configuration = await getOpenIdConfiguration(createStoreDomain(_shopify.name))

  const nitroApp = useNitroApp()

  const query = getQuery(event)

  if (query.error) {
    const error = String(query.error)
    const description = typeof query.error_description === 'string' ? query.error_description : undefined

    const returnTo = sanitizeReturnPath(getCookie(event, RETURN_TO_COOKIE))

    deleteCookie(event, STATE_COOKIE)
    deleteCookie(event, NONCE_COOKIE)
    deleteCookie(event, VERIFIER_COOKIE)
    deleteCookie(event, RETURN_TO_COOKIE)

    await nitroApp.hooks.callHook('customer-account:auth:error', { error: new Error(description ?? error) })

    if (error === 'access_denied') {
      createLogger().debug('Customer account authorization was declined by the customer')

      return sendRedirect(event, returnTo ?? '/')
    }

    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: `[shopify] Customer account authorization failed: ${description ?? error}`,
    })
  }

  // First leg: no authorization code yet, so we start the OAuth flow.
  if (!query.code) {
    createLogger().debug('Starting customer account OAuth flow')

    const state = generateRandomToken(16)
    const nonce = generateRandomToken(16)

    setCookie(event, STATE_COOKIE, state, transientCookieOptions)
    setCookie(event, NONCE_COOKIE, nonce, transientCookieOptions)

    const returnTo = sanitizeReturnPath(query.return_to)

    if (returnTo) {
      setCookie(event, RETURN_TO_COOKIE, returnTo, transientCookieOptions)
    }

    let codeChallenge: string | undefined

    if (!customerAccount.clientSecret) {
      const codeVerifier = generateRandomToken(32)

      setCookie(event, VERIFIER_COOKIE, codeVerifier, transientCookieOptions)

      codeChallenge = await generateCodeChallenge(codeVerifier)
    }

    const asString = (value: unknown) => typeof value === 'string' && value ? value : undefined

    const params = buildAuthorizationParams({
      clientId: customerAccount.clientId,
      redirectUri,
      scope: customerAccount.scope,
      state,
      nonce,
      codeChallenge,
      loginHint: asString(query.login_hint),
      loginHintMode: asString(query.login_hint_mode),
      locale: asString(query.locale),
      regionCountry: asString(query.region_country),
      acrValues: asString(query.acr_values),
    })

    await nitroApp.hooks.callHook('customer-account:auth:authorize', { params })

    return sendRedirect(event, buildAuthorizationURL(configuration, params))
  }

  // Second leg: Shopify redirected back with an authorization code.
  const expectedState = getCookie(event, STATE_COOKIE)
  const expectedNonce = getCookie(event, NONCE_COOKIE)
  const codeVerifier = getCookie(event, VERIFIER_COOKIE)
  const returnTo = sanitizeReturnPath(getCookie(event, RETURN_TO_COOKIE))

  deleteCookie(event, STATE_COOKIE)
  deleteCookie(event, NONCE_COOKIE)
  deleteCookie(event, VERIFIER_COOKIE)
  deleteCookie(event, RETURN_TO_COOKIE)

  if (!expectedState || query.state !== expectedState) {
    throw createError({ status: 403, statusText: 'Forbidden', message: '[shopify] Invalid OAuth state' })
  }

  if (!customerAccount.clientSecret && !codeVerifier) {
    throw createError({ status: 400, statusText: 'Bad Request', message: '[shopify] Missing PKCE verifier' })
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

    if (expectedNonce) {
      const returnedNonce = tokens.id_token ? getIdTokenNonce(tokens.id_token) : undefined

      if (returnedNonce !== expectedNonce) {
        throw new Error('[shopify] Returned nonce does not match the nonce of the authorization request')
      }
    }

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

    if (isTunnelHost) {
      const bridgeNonce = createBridgeNonce({ user, tokens: tokenSet, returnTo })

      return sendRedirect(event, localConsumeUrl(bridgeURL, bridgeNonce))
    }

    await setCustomerAccountSession(event, {
      user,
      tokens: tokenSet,
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, returnTo ?? customerAccount.redirectURL)
  }
  catch (error) {
    createLogger().error('Customer account OAuth flow failed:', error)

    await nitroApp.hooks.callHook('customer-account:auth:error', { error })

    return sendRedirect(event, withQuery(customerAccount.redirectURL, { customer_account_error: '1' }))
  }
})
