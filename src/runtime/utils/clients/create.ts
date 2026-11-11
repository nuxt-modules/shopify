import type { AllOperations } from '@shopify/graphql-client'
import type { CacheOptions } from '@shopify/hydrogen'

import type {
  ModuleOptions,
  ShopifyApiClient,
  ShopifyApiClientConfig,
  ShopifyApiClientRequestOptions,
  ShopifyClientConfig,
  ShopifyClientKind,
  ShopifyClientOptions,
  ShopifyInlineConfig,
} from '../../../module'

import { createTransport, withApiVersion } from './transport'
import { DEFAULT_THROW_ERRORS } from './defaults'
import { requestWithCache } from './cache'
import { handleErrors } from './errors'

export type ClientDefinition<Kind extends ShopifyClientKind = ShopifyClientKind> = {
  kind: Kind

  createConfig: (config: ModuleOptions) => ShopifyApiClientConfig
  createProxyUrl?: (config: ModuleOptions, origin: string, apiVersion: string) => string | undefined
  requestHeaders?: (config: ModuleOptions, headers: ShopifyApiClientConfig['headers'], options: Pick<ShopifyClientOptions, 'event' | 'buyerIp'>) => Record<string, string>
  cachePresets?: (config: ModuleOptions) => Record<string, CacheOptions> | undefined

  authHeader?: string
}

export function isInlineConfig(config: ShopifyClientConfig): config is ShopifyInlineConfig {
  return !config.clients
}

function normalizeConfig(kind: ShopifyClientKind, config: ShopifyClientConfig): ModuleOptions {
  if (!isInlineConfig(config)) return config

  const { name, shopId, logger, errors, ...clientConfig } = config

  return { name, shopId, logger, errors, clients: { [kind]: clientConfig } }
}

export function createClient<
  Operations extends AllOperations = AllOperations,
  Cache extends boolean | undefined = undefined,
>(
  definition: ClientDefinition,
  config: ShopifyClientConfig,
  options: ShopifyClientOptions<Operations, Cache> = {},
): ShopifyApiClient<Operations, Cache> {
  const { authHeader } = definition
  const { event, origin, buyerIp, browserCache, serverCache, auth, apiVersion, headers, retries, logger, throwOnErrors, ...callbacks } = options

  const moduleConfig = normalizeConfig(definition.kind, config)

  const apiClientConfig = definition.createConfig(moduleConfig)

  if (apiVersion) {
    apiClientConfig.apiVersion = apiVersion
    apiClientConfig.apiUrl = withApiVersion(apiClientConfig.apiUrl, apiVersion)
  }

  if (retries !== undefined) apiClientConfig.retries = retries
  if (logger) apiClientConfig.logger = logger
  if (headers) Object.assign(apiClientConfig.headers, headers)

  const proxyUrl = origin ? definition.createProxyUrl?.(moduleConfig, origin, apiClientConfig.apiVersion) : undefined

  if (proxyUrl) apiClientConfig.apiUrl = proxyUrl

  Object.assign(apiClientConfig.headers, definition.requestHeaders?.(moduleConfig, apiClientConfig.headers, { event, buyerIp }))

  callbacks.onConfigure?.({ config: apiClientConfig })

  const transport = createTransport<Operations, Cache>(apiClientConfig, {
    normalize: moduleConfig.graphql?.normalize ?? true,
    fetch: serverCache,
  })

  const shouldThrow = throwOnErrors ?? moduleConfig.errors?.throw ?? DEFAULT_THROW_ERRORS

  const cache = definition.cachePresets && { storage: browserCache, presets: definition.cachePresets(moduleConfig), serverCache: !!serverCache }

  const authenticate = async () => {
    if (auth && authHeader) transport.config.headers[authHeader] = await auth()
  }

  const request: ShopifyApiClient<Operations, Cache>['request'] = async (operation, options) => {
    await callbacks.onRequest?.({
      operation,
      options: options as ShopifyApiClientRequestOptions<keyof Operations, Operations, Cache>,
      config: transport.config,
    })

    const authError = await authenticate().then(() => undefined, (error: Error & { statusCode?: number }) => error)

    const response = authError
      ? { errors: { networkStatusCode: authError.statusCode, message: authError.message } }
      : cache
        ? await requestWithCache(cache, transport.request, operation, options)
        : await transport.request(operation, options)

    if (options?.signal?.aborted) return response

    await callbacks.onResponse?.({
      response: response,
      operation,
      options: options as ShopifyApiClientRequestOptions<keyof Operations, Operations, Cache>,
    })

    if (response.errors) await handleErrors(response.errors, shouldThrow && !authError, callbacks.onErrors, apiClientConfig.logger)

    if (authError && shouldThrow) throw authError

    return response
  }

  const client: ShopifyApiClient<Operations, Cache> = {
    ...transport,
    fetch: (...params) => authenticate().then(() => transport.fetch(...params)),
    requestStream: (...params) => authenticate().then(() => transport.requestStream(...params)),
    request,
  }

  callbacks.onCreate?.({ client })

  return client
}
