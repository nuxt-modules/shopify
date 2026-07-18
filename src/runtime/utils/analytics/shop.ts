import type { ShopAnalytics, ShopifyAnalyticsShopContext } from '../../../module'

import { useStorefront } from '../../composables/storefront/client'
import { createLogger } from '../log'

const SHOP_QUERY = `#graphql
  query ShopifyAnalyticsShop($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop { id }
    localization {
      country { currency { isoCode } }
      language { isoCode }
    }
  }
`

interface ShopQueryResult {
  shop?: { id?: string }
  localization?: {
    country?: { currency?: { isoCode?: string } }
    language?: { isoCode?: string }
  }
}

interface ShopResolverOptions {
  shopId?: string
  currency?: string
  language?: string
  storefrontId?: string
}

function toEnumCode(value?: string): string | undefined {
  return value ? value.toUpperCase().replace(/-/g, '_') : undefined
}

export function createShopResolver(options: ShopResolverOptions) {
  const cache = new Map<string, Promise<ShopAnalytics | null>>()

  const resolve = async (context?: ShopifyAnalyticsShopContext): Promise<ShopAnalytics | null> => {
    const country = toEnumCode(context?.country)
    const language = toEnumCode(context?.language)
    const contextual = !!(country || language)

    let shopId = options.shopId
    let currency = contextual ? undefined : options.currency
    let acceptedLanguage = contextual ? undefined : options.language

    if (!shopId || !currency || !acceptedLanguage) {
      try {
        const { data } = await useStorefront().request<ShopQueryResult>(SHOP_QUERY, {
          variables: { country, language },
        })

        shopId ||= data?.shop?.id
        currency ||= data?.localization?.country?.currency?.isoCode
        acceptedLanguage ||= data?.localization?.language?.isoCode
      }
      catch (error) {
        createLogger().debug('Shop analytics query failed:', error)
      }

      currency ||= options.currency
      acceptedLanguage ||= options.language
    }

    if (!shopId || !currency || !acceptedLanguage) {
      createLogger().warn('Could not resolve shop analytics (missing shop ID, currency, or language). Analytics events will not be sent')

      return null
    }

    return {
      shopId,
      currency,
      acceptedLanguage,
      hydrogenSubchannelId: options.storefrontId || '0',
    }
  }

  return (context?: ShopifyAnalyticsShopContext): Promise<ShopAnalytics | null> => {
    const key = `${toEnumCode(context?.country) ?? ''}:${toEnumCode(context?.language) ?? ''}`

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
