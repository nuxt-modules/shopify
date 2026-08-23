import type { AdminTokenSet, ShopifyAuthCallbacks, ShopifyConfig } from '../../../../module'

import { createStoreDomain } from '../transport'

type AdminConfig = NonNullable<ShopifyConfig['clients']['admin']>

export type AdminAccessTokenOptions = ShopifyAuthCallbacks & {
  storage?: boolean
}

const pendingAccessTokenRequests = new Map<string, Promise<AdminTokenSet>>()

async function getTokenStorage(config: AdminConfig) {
  const storageBase = typeof config.tokenStorage === 'string'
    ? config.tokenStorage
    : 'admin-token'

  return await import('nitropack/runtime')
    .then(({ useStorage }) => useStorage<AdminTokenSet>(storageBase))
    .catch(() => undefined)
}

function isTokenExpired(token: AdminTokenSet): boolean {
  if (!token.expiresAt) return false

  // Refresh 5 minutes before expiry
  return Date.now() >= token.expiresAt - (5 * 60 * 1000)
}

async function fetchAccessToken(
  storeDomain: string,
  params: Record<string, string>,
): Promise<AdminTokenSet> {
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

    throw new Error(`[shopify] Failed to obtain admin API access token: HTTP ${response.status}${errorBody ? ` - ${errorBody}` : ''}`)
  }

  const data = await response.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }

  if (!data.access_token) {
    throw new Error('[shopify] Failed to obtain admin API access token: missing `access_token` in response')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : 0,
  }
}

export async function getAdminAccessToken(
  shopName: string,
  config: AdminConfig,
  options: AdminAccessTokenOptions = {},
): Promise<string> {
  const { accessToken, clientId, clientSecret, refreshToken } = config
  const { storage: store, onAuthRequest, onAuthToken, onAuthError } = options

  if (accessToken && !clientId && !clientSecret) {
    return accessToken
  }

  if (!clientId || !clientSecret) {
    throw new Error('[shopify] Failed to obtain admin API access token: missing `clientId` or `clientSecret` (provide both, or an `accessToken`)')
  }

  let storedToken = store ? await getTokenStorage(config).then(storage => storage?.getItem('token')) : undefined

  if (!storedToken && accessToken) {
    storedToken = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: refreshToken ? Date.now() : 0,
    }
  }

  if (storedToken && !isTokenExpired(storedToken)) {
    return storedToken.accessToken
  }

  const storeDomain = createStoreDomain(shopName)

  const isRefresh = !!storedToken?.refreshToken

  const params: Record<string, string> = isRefresh
    ? {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: storedToken!.refreshToken!,
      }
    : {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }

  const pendingKey = `${shopName}:${clientId}:${params.grant_type}`

  let pendingAccessTokenRequest = pendingAccessTokenRequests.get(pendingKey)

  if (!pendingAccessTokenRequest) {
    pendingAccessTokenRequest = (async () => {
      try {
        await onAuthRequest?.({ params })

        const newToken = await fetchAccessToken(storeDomain, params)

        if (store) {
          await getTokenStorage(config).then(storage => storage?.setItem('token', newToken))
        }

        await onAuthToken?.({ token: newToken, refresh: isRefresh })

        return newToken
      }
      catch (error) {
        await onAuthError?.({ error })

        throw error
      }
    })().finally(() => {
      pendingAccessTokenRequests.delete(pendingKey)
    })

    pendingAccessTokenRequests.set(pendingKey, pendingAccessTokenRequest)
  }

  const token = await pendingAccessTokenRequest

  return token.accessToken
}
