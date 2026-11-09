import type { ConsolaOptions } from 'consola'
import type { Storage } from 'unstorage'

import type { ModuleOptions, ShopifyAdminTokenSet, ShopifyAdminAuthCallbacks } from '../../../../module'

import { createError } from 'h3'
import { createStorage } from 'unstorage'

import { warnUnmountedStorage } from '../../storage'
import { REQUEST_TIMEOUT_MS } from '../defaults'
import { createUpstreamError } from '../errors'
import { createStoreDomain } from '../transport'

type AdminConfig = NonNullable<NonNullable<ModuleOptions['clients']>['admin']>

type AdminAccessTokenOptions = ShopifyAdminAuthCallbacks & {
  storage?: boolean
  logger?: Partial<ConsolaOptions>
}

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

const pendingAccessTokenRequests = new Map<string, Promise<ShopifyAdminTokenSet>>()

let memoryStorage: Storage<ShopifyAdminTokenSet> | undefined

async function getTokenStorage(config: AdminConfig, logger?: Partial<ConsolaOptions>) {
  const storageBase = typeof config.tokenStorage === 'string'
    ? config.tokenStorage
    : 'admin-token'

  return await import('nitropack/runtime')
    .then(({ useStorage }) => {
      const storage = useStorage<ShopifyAdminTokenSet>(storageBase)

      warnUnmountedStorage(storage, storageBase, logger)

      return storage
    })
    .catch(() => memoryStorage ??= createStorage<ShopifyAdminTokenSet>())
}

function isTokenExpired(token: ShopifyAdminTokenSet): boolean {
  if (!token.expiresAt) return false

  return Date.now() >= token.expiresAt - TOKEN_REFRESH_MARGIN_MS
}

async function fetchAccessToken(
  storeDomain: string,
  params: Record<string, string>,
  logger?: Partial<ConsolaOptions>,
): Promise<ShopifyAdminTokenSet> {
  const url = `${storeDomain}/admin/oauth/access_token`

  const rejectUpstream = (error: unknown): never => {
    throw createUpstreamError(502, `Failed to obtain an Admin API access token: ${error}`, error, logger)
  }

  const response = await globalThis.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(rejectUpstream)

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')

    throw createUpstreamError(
      502,
      `Failed to obtain an Admin API access token: HTTP ${response.status}${errorBody ? ` - ${errorBody}` : ''}`,
      { status: response.status, data: errorBody },
      logger,
    )
  }

  const data = await response.json().catch(rejectUpstream) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }

  if (!data.access_token) {
    throw createError({
      status: 502,
      statusText: 'Bad Gateway',
      message: '[shopify] Failed to obtain an Admin API access token: missing `access_token` in response',
    })
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
  const { storage: store, onAuthRequest, onAuthToken, onAuthError, logger } = options

  if (accessToken && !clientId && !clientSecret) {
    return accessToken
  }

  if (!clientId || !clientSecret) {
    throw createError({
      status: 500,
      statusText: 'Internal Server Error',
      message: '[shopify] Failed to obtain an Admin API access token: missing `clientId` or `clientSecret` (provide both, or an `accessToken`)',
    })
  }

  const tokenKey = `${shopName}:${clientId}`

  let storedToken = store ? await getTokenStorage(config, logger).then(storage => storage?.getItem(tokenKey)) : undefined

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

  const storedRefreshToken = storedToken?.refreshToken
  const isRefresh = !!storedRefreshToken

  const params: Record<string, string> = storedRefreshToken
    ? {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: storedRefreshToken,
      }
    : {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }

  const pendingKey = `${tokenKey}:${params.grant_type}`

  let pendingAccessTokenRequest = pendingAccessTokenRequests.get(pendingKey)

  if (!pendingAccessTokenRequest) {
    pendingAccessTokenRequest = (async () => {
      try {
        await onAuthRequest?.({ params })

        const newToken = await fetchAccessToken(storeDomain, params, logger)

        if (store) {
          await getTokenStorage(config, logger).then(storage => storage?.setItem(tokenKey, newToken))
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
