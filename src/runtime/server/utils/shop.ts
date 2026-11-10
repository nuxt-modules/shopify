import type { H3Event } from 'h3'

import type { ShopifyConfig, ShopifyScriptsShopContext } from '../../../module'

import { useRuntimeConfig } from '#imports'
import { createShopResolver } from '../../utils/shop'
import { createStorefrontApiClient } from '../../utils/clients/storefront'

let resolveShop: ReturnType<typeof createShopResolver> | undefined

export function getShopResolver(config: ShopifyConfig) {
  resolveShop ??= createShopResolver(config, config.clients.storefront ? () => createStorefrontApiClient<true>(config, { throwOnErrors: false }) : undefined)

  return resolveShop
}

export function resolveShopifyScripts(event: H3Event): Promise<ShopifyScriptsShopContext> {
  return getShopResolver(useRuntimeConfig(event)._shopify!)(event.context.shopifyMarket)
}
