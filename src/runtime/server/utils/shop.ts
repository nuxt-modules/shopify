import type { H3Event } from 'h3'

import type { ShopifyConfig, ShopifyScriptsShopContext } from '../../../module'

import { useRuntimeConfig } from '#imports'
import { createShopResolver } from '../../utils/shop'
import { createStorefrontApiClient } from '../../utils/clients/storefront'
import { getShopifyRequestContext } from './request-context'

let resolveShop: ReturnType<typeof createShopResolver> | undefined

export function getShopResolver(config: ShopifyConfig) {
  resolveShop ??= createShopResolver(config, config.clients.storefront ? () => createStorefrontApiClient<true>(config, { throwOnErrors: false }) : undefined)

  return resolveShop
}

export async function resolveShopifyScripts(event: H3Event): Promise<ShopifyScriptsShopContext> {
  const locale = await getShopifyRequestContext(event).then(requestContext => requestContext.locale, () => undefined)

  return getShopResolver(useRuntimeConfig(event)._shopify!)(locale)
}
