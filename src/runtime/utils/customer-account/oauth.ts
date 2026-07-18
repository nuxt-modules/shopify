import type { CustomerAccountTokens, OpenIdConfiguration } from '../../../module'

import { withQuery } from 'ufo'

const openIdConfigurationCache = new Map<string, Promise<OpenIdConfiguration>>()

export function getOpenIdConfiguration(storeDomain: string): Promise<OpenIdConfiguration> {
  if (!openIdConfigurationCache.has(storeDomain)) {
    const request = $fetch<OpenIdConfiguration>(`${storeDomain}/.well-known/openid-configuration`)
      .catch((error) => {
        openIdConfigurationCache.delete(storeDomain)

        throw new Error(`[shopify] Failed to fetch the customer account OpenID configuration: ${error}`)
      })

    openIdConfigurationCache.set(storeDomain, request)
  }

  return openIdConfigurationCache.get(storeDomain)!
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateRandomToken(length = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(length)))
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))

  return base64UrlEncode(new Uint8Array(digest))
}

function getBasicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`
}

export function getIdTokenNonce(idToken: string): string | undefined {
  const payload = idToken.split('.')[1]

  if (!payload) return undefined

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    const bytes = Uint8Array.from(atob(padded), char => char.charCodeAt(0))

    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { nonce?: string }

    return claims.nonce
  }
  catch {
    return undefined
  }
}

export function normalizeLocale(locale: string): string {
  const [language, region] = locale.replace(/_/g, '-').split('-')

  if (!language) return ''

  return region
    ? `${language.toLowerCase()}-${region.toUpperCase()}`
    : language.toLowerCase()
}

export function sanitizeReturnPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  // eslint-disable-next-line no-control-regex
  const path = value.replace(/[\u0000-\u0020\u007F]/g, '')

  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return undefined
  }

  return path
}

export function buildAuthorizationParams(params: {
  clientId: string
  redirectUri: string
  scope: string[]
  state: string
  nonce?: string
  codeChallenge?: string
  loginHint?: string
  loginHintMode?: string
  locale?: string
  regionCountry?: string
  acrValues?: string
}): Record<string, string> {
  const locale = params.locale ? normalizeLocale(params.locale) : undefined

  return {
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: [...new Set(params.scope)].join(' '),
    state: params.state,
    ...(params.nonce ? { nonce: params.nonce } : {}),
    ...(params.codeChallenge
      ? {
          code_challenge: params.codeChallenge,
          code_challenge_method: 'S256',
        }
      : {}),
    ...(locale ? { locale } : {}),
    ...(params.regionCountry ? { region_country: params.regionCountry } : {}),
    ...(params.acrValues ? { acr_values: params.acrValues } : {}),
    ...(params.loginHint
      ? {
          login_hint: params.loginHint,
          ...(params.loginHintMode ? { login_hint_mode: params.loginHintMode } : {}),
        }
      : {}),
  }
}

export function buildAuthorizationURL(configuration: OpenIdConfiguration, params: Record<string, string>): string {
  return withQuery(configuration.authorization_endpoint, params)
}

async function requestTokens(tokenEndpoint: string, body: Record<string, string>, basicAuth?: string): Promise<CustomerAccountTokens> {
  const tokens = await $fetch<CustomerAccountTokens>(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      ...(basicAuth ? { Authorization: basicAuth } : {}),
    },
    body: new URLSearchParams(body).toString(),
  }).catch((error) => {
    throw new Error(`[shopify] Failed to obtain customer account tokens: ${error}`)
  })

  if (!tokens?.access_token) {
    throw new Error('[shopify] Failed to obtain customer account tokens: no access token in response')
  }

  return tokens
}

export function exchangeAuthorizationCode(configuration: OpenIdConfiguration, params: {
  clientId: string
  clientSecret?: string
  redirectUri: string
  code: string
  codeVerifier?: string
}): Promise<CustomerAccountTokens> {
  const confidential = !!params.clientSecret

  return requestTokens(configuration.token_endpoint, {
    grant_type: 'authorization_code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
    ...(confidential ? {} : { code_verifier: params.codeVerifier! }),
  }, confidential ? getBasicAuthHeader(params.clientId, params.clientSecret!) : undefined)
}

export function refreshAccessToken(configuration: OpenIdConfiguration, params: {
  clientId: string
  clientSecret?: string
  refreshToken: string
}): Promise<CustomerAccountTokens> {
  const confidential = !!params.clientSecret

  return requestTokens(configuration.token_endpoint, {
    grant_type: 'refresh_token',
    client_id: params.clientId,
    refresh_token: params.refreshToken,
  }, confidential ? getBasicAuthHeader(params.clientId, params.clientSecret!) : undefined)
}

export async function fetchCustomerIdentity(apiUrl: string, accessToken: string) {
  const response = await $fetch<{
    data?: {
      customer?: {
        firstName: string | null
        lastName: string | null
        emailAddress: { emailAddress: string } | null
      }
    }
  }>(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': accessToken,
    },
    body: JSON.stringify({
      operationName: 'getCustomer',
      query: 'query getCustomer { customer { firstName lastName emailAddress { emailAddress } } }',
    }),
  }).catch((error) => {
    throw new Error(`[shopify] Failed to fetch the customer identity: ${error}`)
  })

  const customer = response?.data?.customer

  if (!customer?.emailAddress?.emailAddress) {
    throw new Error('[shopify] Failed to fetch the customer identity: incomplete customer response')
  }

  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.emailAddress.emailAddress,
  }
}

export function buildLogoutURL(configuration: OpenIdConfiguration, params: {
  idToken: string
  postLogoutRedirectUri: string
}): string {
  return withQuery(configuration.end_session_endpoint, {
    id_token_hint: params.idToken,
    post_logout_redirect_uri: params.postLogoutRedirectUri,
  })
}
