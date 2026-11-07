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

import type { H3Error } from 'h3'

import { getRequestHeader } from 'h3'

import { pickShopifyCookies } from '../cookies'
import { resolveBuyerIp } from './buyer-ip'
import {
  BUYER_IP_HEADER,
  PRIVATE_TOKEN_HEADER,
  createTransport,
  withApiVersion,
} from './transport'
import { DEFAULT_THROW_ERRORS } from './defaults'
import { requestWithCache } from './cache'
import { handleErrors } from './errors'

export type ClientDefinition<Kind extends ShopifyClientKind = ShopifyClientKind> = {
  kind: Kind

  createConfig: (config: ModuleOptions) => ShopifyApiClientConfig
  createProxyUrl?: (config: ModuleOptions, origin: string, apiVersion: string) => string | undefined
  buyerIpHeader?: (config: ModuleOptions) => string | undefined
  cachePresets?: (config: ModuleOptions) => Record<string, CacheOptions> | undefined

  authHeader?: string
  shopifyCookies?: boolean
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
  const { event, origin, browserCache, serverCache, buyerIp, ...callbacks } = options

  const moduleConfig = normalizeConfig(definition.kind, config)

  const apiClientConfig = definition.createConfig(moduleConfig)

  if (options.apiVersion) {
    apiClientConfig.apiVersion = options.apiVersion
    apiClientConfig.apiUrl = withApiVersion(apiClientConfig.apiUrl, options.apiVersion)
  }

  if (options.retries !== undefined) apiClientConfig.retries = options.retries
  if (options.logger) apiClientConfig.logger = options.logger
  if (options.headers) Object.assign(apiClientConfig.headers, options.headers)

  const proxyUrl = origin ? definition.createProxyUrl?.(moduleConfig, origin, apiClientConfig.apiVersion) : undefined

  if (proxyUrl) apiClientConfig.apiUrl = proxyUrl

  if (import.meta.server && event && definition.shopifyCookies) {
    const cookie = pickShopifyCookies(getRequestHeader(event, 'cookie'))

    if (cookie) apiClientConfig.headers['Cookie'] = cookie
  }

  if (buyerIp !== false && apiClientConfig.headers[PRIVATE_TOKEN_HEADER]) {
    const resolvedBuyerIp = buyerIp ?? (import.meta.server && event ? resolveBuyerIp(event, definition.buyerIpHeader?.(moduleConfig)) : undefined)

    if (resolvedBuyerIp) apiClientConfig.headers[BUYER_IP_HEADER] = resolvedBuyerIp
  }

  callbacks.onConfigure?.({ config: apiClientConfig })

  const transport = createTransport<Operations, Cache>(apiClientConfig, {
    normalize: moduleConfig.graphql?.normalize ?? true,
    fetch: serverCache,
  })

  const { auth } = options

  const throwOnErrors = options.throwOnErrors
    ?? moduleConfig.errors?.throw
    ?? DEFAULT_THROW_ERRORS

  const cachePresets = definition.cachePresets?.(moduleConfig)

  const authenticate = async () => {
    if (auth && authHeader) transport.config.headers[authHeader] = await auth()
  }

  const request: ShopifyApiClient<Operations, Cache>['request'] = async (operation, options) => {
    await callbacks.onRequest?.({
      operation,
      options: options as ShopifyApiClientRequestOptions<keyof Operations, Operations, Cache>,
      config: transport.config,
    })

    const authError = await authenticate().then(() => undefined, (error: H3Error) => error)

    const response = authError
      ? { errors: { networkStatusCode: authError.statusCode, message: authError.message.replace(/^\[shopify\] /, '') } }
      : definition.cachePresets
        ? await requestWithCache(browserCache, transport.request, operation, options, cachePresets, Boolean(serverCache))
        : await transport.request(operation, options)

    if (options?.signal?.aborted) return response

    await callbacks.onResponse?.({
      response: response,
      operation,
      options: options as ShopifyApiClientRequestOptions<keyof Operations, Operations, Cache>,
    })

    if (response.errors) await handleErrors(response.errors, throwOnErrors && !authError, callbacks.onErrors, apiClientConfig.logger)

    if (authError && throwOnErrors) throw authError

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
