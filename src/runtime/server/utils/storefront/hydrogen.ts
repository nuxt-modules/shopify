import type { ShopifyRequestContext, ShopifyRequestContextWithBuyerIp, StorefrontClient } from '@shopify/hydrogen'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../../../../module'

import { createStorefrontClient, handleShopifyRedirects } from '@shopify/hydrogen'

import { useRuntimeConfig } from '#imports'
import { MOCK_STORE_DOMAIN } from '../../../utils/clients/storefront'
import { createStoreDomain } from '../../../utils/clients/transport'
import { getShopifyRequestContext } from '../request-context'
import { toShopifyRequest } from '../routes'

function hasBuyerIp(requestContext: ShopifyRequestContext): requestContext is ShopifyRequestContextWithBuyerIp {
  return !!requestContext.buyerIp
}

export function createHydrogenStorefrontClient(requestContext: ShopifyRequestContext, { name, storefrontId, clients: { storefront } }: ShopifyConfig): StorefrontClient {
  const config = {
    storeDomain: storefront?.mock ? MOCK_STORE_DOMAIN : createStoreDomain(name),
    storefrontId: storefront?.mock ? undefined : storefrontId || undefined,
    apiVersion: storefront?.apiVersion,
  }

  const privateStorefrontToken = storefront?.mock ? undefined : storefront?.privateAccessToken

  const client = !privateStorefrontToken
    ? createStorefrontClient({ type: 'public', requestContext, config: { ...config, publicStorefrontToken: storefront?.publicAccessToken || undefined } })
    : hasBuyerIp(requestContext)
      ? createStorefrontClient({ type: 'private', requestContext, config: { ...config, privateStorefrontToken } })
      : createStorefrontClient({ type: 'private_no_buyer_context', requestContext, config: { ...config, privateStorefrontToken } })

  const graphql = (async (...args: Parameters<StorefrontClient['graphql']>) => {
    const result = await client.graphql(...args)
    const headers = new Headers(result.headers)

    headers.delete('set-cookie')

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
