/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AllOperations } from '@shopify/graphql-client'
import type { CacheOptions } from 'nitropack'

import type {
  PublicShopifyConfig,
  ShopifyApiClient,
  ShopifyApiClientRequestOptions,
  ShopifyClientConfig,
  ShopifyClientDefinition,
  ShopifyClientKind,
  ShopifyClientOptions,
  ShopifyConfig,
  ShopifyInlineConfig,
} from '../../../module'

import { getRequestHeader } from 'h3'
import { joinURL } from 'ufo'

import { createTrackingHeaders, collectTrackingHeaders } from '../../server/utils/tracking'
import { PROXY_API_VERSION_HEADER, createTransport, withApiVersion } from './transport'
import { DEFAULT_API_VERSION, DEFAULT_RETRIES, DEFAULT_THROW_ERRORS } from './defaults'
import useCache from './cache'
import useErrors from './errors'

function isFullConfig(config: ShopifyClientConfig): config is ShopifyConfig | PublicShopifyConfig {
  return !!config && 'clients' in config && !!(config as ShopifyConfig).clients
}

function normalizeConfig(kind: ShopifyClientKind, config: ShopifyClientConfig): ShopifyConfig {
  const normalized = isFullConfig(config)
    ? { ...config }
    : (() => {
        const { name, logger, errors, ...clientConfig } = config ?? {} as ShopifyInlineConfig

        return { name, logger, errors, clients: { [kind]: clientConfig } }
      })()

  const clientConfig = (normalized as ShopifyConfig).clients?.[kind]

  if (clientConfig) {
    clientConfig.apiVersion ??= DEFAULT_API_VERSION
    clientConfig.retries ??= DEFAULT_RETRIES
  }

  return normalized as ShopifyConfig
}

export function createClient<
  Operations extends AllOperations = AllOperations,
  Cache extends boolean | undefined = undefined,
>(
  definition: ShopifyClientDefinition,
  config: ShopifyClientConfig,
  options: ShopifyClientOptions<Operations, Cache> = {},
): ShopifyApiClient<Operations, Cache> {
  const { kind, authHeader } = definition
  const { event, origin, cache, ...callbacks } = options

  const moduleConfig = normalizeConfig(kind, config)
  const clientConfig = moduleConfig.clients?.[kind]

  const apiClientConfig = definition.createConfig(moduleConfig)

  if (options.apiVersion) {
    apiClientConfig.apiVersion = options.apiVersion
    apiClientConfig.apiUrl = withApiVersion(apiClientConfig.apiUrl, options.apiVersion)
  }

  if (options.retries !== undefined) apiClientConfig.retries = options.retries
  if (options.logger) apiClientConfig.logger = options.logger
  if (options.headers) Object.assign(apiClientConfig.headers, options.headers)

  const proxy = (clientConfig as { proxy?: { path: string } | false })?.proxy

  if (origin && proxy) {
    apiClientConfig.apiUrl = joinURL(origin, proxy.path)

    if (options.apiVersion) {
      apiClientConfig.headers[PROXY_API_VERSION_HEADER] = options.apiVersion
    }
  }

  if (event) {
    if (definition.tracking) {
      Object.assign(apiClientConfig.headers, createTrackingHeaders(event, getRequestHeader(event, 'cookie')))
    }
    else if (definition.cookies && proxy) {
      const cookie = getRequestHeader(event, 'cookie')

      if (cookie) apiClientConfig.headers['Cookie'] = cookie
    }
  }

  callbacks.onConfigure?.({ config: apiClientConfig })

  const transport = createTransport<Operations, Cache>(apiClientConfig)

  const auth = options.auth || undefined

  const throwOnErrors = options.throwOnErrors
    ?? moduleConfig.errors?.throw
    ?? DEFAULT_THROW_ERRORS

  const cacheOptions = definition.cache
    ? (clientConfig as { cache?: { options?: Record<string, Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>> } | false })?.cache || undefined
    : undefined

  const request: ShopifyApiClient<Operations, Cache>['request'] = async (operation, options) => {
    await callbacks.onRequest?.({
      operation: operation as keyof Operations,
      options: options as ShopifyApiClientRequestOptions<keyof Operations, Operations, Cache>,
      config: transport.config,
    })

    if (auth && authHeader) {
      transport.config.headers[authHeader] = await auth()
    }

    const response = definition.cache
      ? await useCache(cache, transport.request as any, operation, options, cacheOptions?.options)
      : await transport.request(operation, options)

    if (event && definition.tracking) collectTrackingHeaders(event, response.headers)

    if (response.errors) await useErrors(response.errors, throwOnErrors, callbacks.onErrors)

    await callbacks.onResponse?.({
      response: response,
      operation: operation as keyof Operations,
      options: options as ShopifyApiClientRequestOptions<keyof Operations, Operations, Cache>,
    })

    return response
  }

  const client = { ...transport, request } as ShopifyApiClient<Operations, Cache>

  callbacks.onCreate?.({ client })

  return client
}
