import type { CustomFetchApi } from '@shopify/graphql-client'
import type { ShopifyRequestContext, ShopifyRequestContextWithBuyerIp, StorefrontClient } from '@shopify/hydrogen'
import type { H3Event } from 'h3'

import { useRuntimeConfig } from 'nitropack/runtime'
import type { ShopifyConfig } from '../../../../module'

import { generateHttpFetch } from '@shopify/graphql-client'
import { StorefrontApiError, createStorefrontClient, handleShopifyRedirects } from '@shopify/hydrogen'

import { warnAboutDeprecations } from '../../../utils/clients/errors'
import { shopifyFetch } from '../../../utils/clients/fetch'
import { createMockStoreDomain, createStorefrontConfig } from '../../../utils/clients/storefront'
import { createClientLogger, createStoreDomain } from '../../../utils/clients/transport'
import { getShopifyRequestContext } from '../request-context'
import { toShopifyRequest } from '../routes'
import { createStorefrontCallbacks } from './client'

function hasBuyerIp(requestContext: ShopifyRequestContext): requestContext is ShopifyRequestContextWithBuyerIp {
  return !!requestContext.buyerIp
}

function createConfiguredFetch(config: ShopifyConfig, onConfigure: ReturnType<typeof createStorefrontCallbacks>['onConfigure']): CustomFetchApi {
  const clientConfig = config.clients.storefront ? createStorefrontConfig(config) : undefined

  if (clientConfig) onConfigure?.({ config: clientConfig })

  const httpFetch = generateHttpFetch({
    clientLogger: createClientLogger(clientConfig?.logger) ?? (() => {}),
    customFetchApi: shopifyFetch,
  })

  return (url, init) => {
    const headers = new Headers(init?.headers)

    for (const [name, value] of Object.entries(clientConfig?.headers ?? {})) headers.set(name, String(value))

    return httpFetch([url, { ...init, headers }], 1, clientConfig?.retries ?? 0).catch((error: unknown) => {
      throw init?.signal?.aborted ? init.signal.reason : error
    })
  }
}

export function createHydrogenStorefrontClient(requestContext: ShopifyRequestContext, shopify: ShopifyConfig): StorefrontClient {
  const { name, storefrontId, clients: { storefront } } = shopify
  const { onConfigure, onRequest, onResponse, onErrors } = createStorefrontCallbacks()

  let configuredFetch: CustomFetchApi | undefined

  const config = {
    storeDomain: storefront?.mock ? createMockStoreDomain(storefront.mock) : createStoreDomain(name),
    storefrontId: storefront?.mock ? undefined : storefrontId || undefined,
    apiVersion: storefront?.apiVersion,
    fetch: (url: string, init?: Parameters<CustomFetchApi>[1]) => (configuredFetch ??= createConfiguredFetch(shopify, onConfigure))(url, init),
  }

  const privateStorefrontToken = storefront?.mock ? undefined : storefront?.privateAccessToken

  const client = !privateStorefrontToken
    ? createStorefrontClient({ type: 'public', requestContext, config: { ...config, publicStorefrontToken: storefront?.publicAccessToken || undefined } })
    : hasBuyerIp(requestContext)
      ? createStorefrontClient({ type: 'private', requestContext, config: { ...config, privateStorefrontToken } })
      : createStorefrontClient({ type: 'private_no_buyer_context', requestContext, config: { ...config, privateStorefrontToken } })

  const graphql = (async (...args: Parameters<StorefrontClient['graphql']>) => {
    const [doc, options] = args
    const request = { operation: String(doc), options: { variables: options?.variables } }

    configuredFetch ??= createConfiguredFetch(shopify, onConfigure)

    await onRequest?.(request)

    const startedAt = performance.now()

    const result = await client.graphql(...args).catch(async (error: unknown) => {
      if (options?.signal?.aborted) throw error

      const errors = { networkStatusCode: error instanceof StorefrontApiError ? error.status : undefined, message: error instanceof Error ? error.message : String(error) }

      await onResponse?.({ ...request, response: { errors }, duration: performance.now() - startedAt })
      await onErrors?.({ errors })

      throw error
    })

    const errors = result.errors && { graphQLErrors: result.errors.map(error => ({ ...error, locations: error.locations?.slice(), path: error.path?.slice() })) }

    const headers = new Headers(result.headers)

    headers.delete('set-cookie')

    await onResponse?.({ ...request, response: { data: result.data, errors, headers: new Headers(headers) }, duration: performance.now() - startedAt })

    if (import.meta.dev) warnAboutDeprecations('storefront', request.operation, storefront?.apiVersion, headers, shopify.logger)

    if (errors) await onErrors?.({ errors })

    return { ...result, headers }
  }) as StorefrontClient['graphql']

  return { ...client, graphql }
}

export async function getShopifyRedirect(event: H3Event): Promise<Response | null> {
  const config = useRuntimeConfig(event)._shopify!
  const requestContext = await getShopifyRequestContext(event).catch(() => undefined)

  if (!requestContext) return null

  return handleShopifyRedirects({
    request: toShopifyRequest(event),
    storefrontClient: createHydrogenStorefrontClient(requestContext, config),
    routeTemplates: config.routeTemplates,
  })
}
