import type { AdminOperations } from '../../../../clients/admin'

import type { AdminTokenSet, ShopifyApiClient, ShopifyConfig } from '../../../../module'

import { createError } from 'h3'

import { createStoreDomain } from '../../../utils/client'

type AdminConfig = NonNullable<ShopifyConfig['clients']['admin']>

let pendingAccessTokenRequest: Promise<AdminTokenSet> | undefined

async function getTokenStorage(config: AdminConfig) {
  const storageBase = typeof config.tokenStorage === 'string'
    ? config.tokenStorage
    : 'admin-token'

  return (await import('nitropack/runtime')).useStorage<AdminTokenSet>(storageBase)
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

  pendingAccessTokenRequest = (async () => {
    const nitroApp = await import('nitropack/runtime')
      .then(({ useNitroApp }) => useNitroApp())
      .catch(() => undefined)

    try {
      await nitroApp?.hooks.callHook('admin:auth:request', { params })

      const newToken = await fetchAccessToken(storeDomain, params)

      if (store) {
        await getTokenStorage(config).then(storage => storage.setItem('token', newToken))
      }

      await nitroApp?.hooks.callHook(isRefresh ? 'admin:auth:refresh' : 'admin:auth:success', { token: newToken })

      return newToken
    }
    catch (error) {
      await nitroApp?.hooks.callHook('admin:auth:error', { error })

      throw error
    }
  })().finally(() => {
    pendingAccessTokenRequest = undefined
  })

  const token = await pendingAccessTokenRequest

  return token.accessToken
}

export const withAdminCredentials = async <Operations extends AdminOperations, Cache extends undefined>(client: ShopifyApiClient<Operations, Cache>, config?: Partial<ShopifyConfig>): Promise<ShopifyApiClient<Operations, Cache>> => {
  const shopName = config?.name
  const adminClientConfig = config?.clients?.admin

  if (!shopName || !adminClientConfig) {
    throw createError({
      statusCode: 500,
      message: '[shopify] Failed to create admin client: missing shop name or admin config',
    })
  }

  const accessToken = await getAdminAccessToken(shopName, adminClientConfig, adminClientConfig.tokenStorage !== false)

  client.config.headers['X-Shopify-Access-Token'] = accessToken

  return client
}
