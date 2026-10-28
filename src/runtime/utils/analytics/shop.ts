import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'
import type { ShopifyScriptsI18n, ShopifyScriptTagsOptions } from '@shopify/hydrogen'

import type { PublicShopifyConfig, ShopifyAnalyticsShopContext } from '../../../module'

import { createLogger } from '../log'

export type ShopifyScriptsShopContext = Pick<ShopifyScriptTagsOptions, 'shop' | 'i18n'>

type AnalyticsConfig = Exclude<PublicShopifyConfig['analytics'], false>

const SHOP_QUERY = `#graphql
  query ShopifyAnalyticsShop($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop { id }
    localization {
      country { isoCode currency { isoCode } }
      language { isoCode }
    }
  }
`

interface ShopQueryResult {
  shop?: { id?: string }
  localization?: {
    country?: { isoCode?: string, currency?: { isoCode?: string } }
    language?: { isoCode?: string }
  }
}

function toI18n(country?: string, language?: string, currency?: string): ShopifyScriptsI18n | undefined {
  if (!country || !language) return undefined

  return { country, language, ...(currency ? { currency } : {}) } as ShopifyScriptsI18n
}

export function createShopResolver(name: string, analytics: AnalyticsConfig, client: Pick<StorefrontApiClient<true>, 'request'>) {
  const cache = new Map<string, Promise<ShopifyScriptsShopContext | null>>()

  const resolve = async (context: ShopifyAnalyticsShopContext): Promise<ShopifyScriptsShopContext | null> => {
    const configured: Pick<AnalyticsConfig, 'country' | 'language' | 'currency'> = context.country || context.language ? {} : analytics

    const complete = !!(analytics.shopId && configured.country && configured.language && configured.currency)

    const result = complete
      ? undefined
      : await client.request<ShopQueryResult>(SHOP_QUERY, { variables: context })
          .then(({ data }) => data)
          .catch(error => void createLogger().debug('Shop analytics query failed:', error))

    const shopId = analytics.shopId || result?.shop?.id

    if (!shopId) {
      createLogger().warn('Could not resolve the shop ID for analytics. Set `analytics.shopId` or make sure the storefront client can reach the Shopify API')

      return null
    }

    const i18n = toI18n(
      configured.country || result?.localization?.country?.isoCode,
      configured.language || result?.localization?.language?.isoCode,
      configured.currency || result?.localization?.country?.currency?.isoCode,
    )

    return {
      shop: { shopId, storefrontId: analytics.storefrontId || '0', myshopifyDomain: `${name}.myshopify.com` },
      ...(i18n ? { i18n } : {}),
    }
  }

  return (context: ShopifyAnalyticsShopContext = {}): Promise<ShopifyScriptsShopContext | null> => {
    const key = `${context.country ?? ''}:${context.language ?? ''}`

    let pending = cache.get(key)

    if (!pending) {
      pending = resolve(context).then((resolved) => {
        if (!resolved) cache.delete(key)

        return resolved
      })

      cache.set(key, pending)
    }

    return pending
  }
}
