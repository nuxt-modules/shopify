import type { StorefrontApiClient } from '@nuxtjs/shopify/storefront'
import type { ShopifyScriptsI18n } from '@shopify/hydrogen'

import type { PublicShopifyConfig, ShopifyScriptsShopContext } from '../../module'

type ShopConfig = Pick<PublicShopifyConfig, 'name' | 'shopId' | 'storefrontId' | 'i18n' | 'analytics'>

const SHOP_QUERY = `#graphql
  query ShopifyShopContext($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop { id }
    localization {
      country { isoCode currency { isoCode } }
      language { isoCode }
    }
  }
`

type ShopQueryResult = {
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

const MAX_CACHED_MARKETS = 50

type ShopLookupClient = Pick<StorefrontApiClient<boolean | undefined>, 'request'>

type ShopResolution = {
  resolved: ShopifyScriptsShopContext
  failed: boolean
}

// The logger is passed in: this file runs in the app and in the server, which each read their config differently
export function createShopResolver(config: ShopConfig, logger: { warn(message: string, ...args: unknown[]): void }, getClient?: () => ShopLookupClient | Promise<ShopLookupClient>) {
  const cache = new Map<string, ShopifyScriptsShopContext>()

  const myshopifyDomain = `${config.name}.myshopify.com`

  let client: ShopLookupClient | undefined

  let warned = false

  const lookUp = async (lookupClient: () => ShopLookupClient | Promise<ShopLookupClient>, country?: string, language?: string) => {
    client ??= await lookupClient()

    const { data, errors } = await client.request<ShopQueryResult>(SHOP_QUERY, { variables: { country, language } })

    if (!data) throw new Error(errors?.message ?? 'The Storefront API returned no data')

    return data
  }

  const resolve = async (market?: ShopifyScriptsI18n): Promise<ShopResolution> => {
    const { pathPrefix, ...requested }: Partial<ShopifyScriptsI18n> = market ?? config.i18n?.defaultLocale ?? {}

    const tracked = !!config.analytics
    const incomplete = (tracked && !config.shopId) || !requested.country || !requested.language || (tracked && !requested.currency)

    let result: ShopQueryResult | undefined
    let failed = false

    if (incomplete && getClient) {
      try {
        result = await lookUp(getClient, requested.country || undefined, requested.language || undefined)
      }
      catch (error) {
        failed = true

        if (!warned) logger.warn('Could not look up the shop and its default locale through the Storefront API, so Shopify\'s scripts run without them. Set `shopId` and an `i18n.defaultLocale` with its `currency` to skip the lookup:', error)

        warned = true
      }
    }

    const shopId = config.shopId || result?.shop?.id

    const i18n = toI18n(
      requested.country || result?.localization?.country?.isoCode,
      requested.language || result?.localization?.language?.isoCode,
      requested.currency || result?.localization?.country?.currency?.isoCode,
    )

    const trackedShopId = tracked ? shopId : undefined

    return {
      resolved: {
        shop: trackedShopId
          ? { shopId: trackedShopId, storefrontId: config.storefrontId || '0', myshopifyDomain }
          : { shopId: '0', storefrontId: '', myshopifyDomain },
        shopifyAnalytics: !!trackedShopId,
        ...(i18n ? { i18n: pathPrefix ? { ...i18n, pathPrefix } : i18n } : {}),
      },
      failed,
    }
  }

  return async (market?: ShopifyScriptsI18n): Promise<ShopifyScriptsShopContext> => {
    const key = market ? [market.country, market.language, market.currency, market.pathPrefix].join(':') : ''

    const cached = cache.get(key)

    if (cached) return cached

    const { resolved, failed } = await resolve(market)

    if (!failed) {
      if (cache.size >= MAX_CACHED_MARKETS) cache.delete(cache.keys().next().value!)

      cache.set(key, resolved)
    }

    return resolved
  }
}
