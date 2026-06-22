import { withQuery } from 'ufo'

export type OpenIdConfiguration = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint: string
}

export type CustomerAccountTokens = {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_in?: number
  token_type?: string
}

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

export function buildAuthorizationURL(configuration: OpenIdConfiguration, params: {
  clientId: string
  redirectUri: string
  scope: string[]
  state: string
  codeChallenge?: string
}): string {
  return withQuery(configuration.authorization_endpoint, {
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: [...new Set(params.scope)].join(' '),
    state: params.state,
    ...(params.codeChallenge
      ? {
          code_challenge: params.codeChallenge,
          code_challenge_method: 'S256',
        }
      : {}),
  })
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
