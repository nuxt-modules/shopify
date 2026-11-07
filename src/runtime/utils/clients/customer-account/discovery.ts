import type { ShopifyConfig } from '../../../../module'

import { createStoreDomain } from '../transport'

type Logger = {
  warn: (message: string) => void
}

const SHOP_ID = /^\d+$/

const LOOKUP_TIMEOUT_MS = 10_000

export async function resolveShopId(config: ShopifyConfig, base?: ShopifyConfig, logger?: Logger): Promise<ShopifyConfig> {
  if (!config.clients.customerAccount) return config

  const sameShop = config.name === base?.name

  if (config.shopId && (config.shopId !== base?.shopId || sameShop)) return config
  if (!config.shopId && sameShop && base?.shopId) return { ...config, shopId: base.shopId }

  const storeDomain = createStoreDomain(config.name)

  const shopId = await fetch(`${storeDomain}/.well-known/customer-account-api`, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) })
    .then(async response => (await response.json() as { graphql_api?: string }).graphql_api)
    .then(apiUrl => apiUrl ? new URL(apiUrl).pathname.split('/')[1] : undefined)
    .catch(() => undefined)

  if (!shopId || !SHOP_ID.test(shopId)) {
    logger?.warn(`Could not look up the shop ID at \`${storeDomain}/.well-known/customer-account-api\`. Enable the Customer Account API for your store, or set \`shopId\``)

    return config.shopId ? { ...config, shopId: undefined } : config
  }

  return { ...config, shopId }
}
