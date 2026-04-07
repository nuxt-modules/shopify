import type { ShopifyConfig } from '../../../../schemas'
import { createStoreDomain } from '../../../utils/client'

type AdminConfig = NonNullable<ShopifyConfig['clients']['admin']>

type StoredToken = {
  accessToken: string
  expiresAt: number
  refreshToken?: string
}

let pendingAccessTokenRequest: Promise<StoredToken> | undefined

async function getTokenStorage(config: AdminConfig) {
  const storageBase = typeof config.tokenStorage === 'string'
    ? config.tokenStorage
    : 'admin-token'

  return (await import('nitropack/runtime')).useStorage<StoredToken>(storageBase)
}

function isTokenExpired(token: StoredToken): boolean {
  if (!token.expiresAt) return false

  // Refresh 5 minutes before expiry
  return Date.now() >= token.expiresAt - (5 * 60 * 1000)
}

async function fetchAccessToken(
  storeDomain: string,
  params: Record<string, string>,
): Promise<StoredToken> {
  const url = `${storeDomain}/admin/oauth/access_token`

  const response = await globalThis.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams(params),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')

    throw new Error(`[shopify] Failed to obtain admin API access token: ${errorBody}`)
  }

  const data = await response.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }

  if (!data.access_token) {
    throw new Error('[shopify] Failed to obtain admin API access token: Missing access_token in response')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : 0,
  }
}

export async function getAdminAccessToken(shopName: string, config: AdminConfig, store?: boolean): Promise<string> {
  const { accessToken, clientId, clientSecret, refreshToken } = config

  if (accessToken && !clientId && !clientSecret) {
    return accessToken
  }

  if (!clientId || !clientSecret) {
    throw new Error('[shopify] Failed to obtain admin API access token: Client ID and secret must be provided')
  }

  let storedToken = store ? await getTokenStorage(config).then(storage => storage.getItem('token')) : undefined

  if (!storedToken && accessToken) {
    storedToken = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: 0,
    }
  }

  if (storedToken && !isTokenExpired(storedToken)) {
    return storedToken.accessToken
  }

  if (pendingAccessTokenRequest) {
    const token = await pendingAccessTokenRequest

    return token.accessToken
  }

  const storeDomain = createStoreDomain(shopName)

  pendingAccessTokenRequest = fetchAccessToken(storeDomain, storedToken?.refreshToken
    ? {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: storedToken.refreshToken,
      }
    : {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      },
  ).then(async (newToken) => {
    if (store) {
      await getTokenStorage(config).then(storage => storage.setItem('token', newToken))
    }

    return newToken
  }).finally(() => {
    pendingAccessTokenRequest = undefined
  })

  const token = await pendingAccessTokenRequest

  return token.accessToken
}
