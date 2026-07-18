import type { ShopAnalytics } from '../../../module'

import { useStorefront } from '../../composables/storefront/client'
import { createLogger } from '../log'

const SHOP_QUERY = `#graphql
  query ShopifyAnalyticsShop {
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

export async function resolveShopAnalytics(options: {
  shopId?: string
  currency?: string
  language?: string
  storefrontId?: string
}): Promise<ShopAnalytics | null> {
  let shopId = options.shopId
  let currency = options.currency
  let acceptedLanguage = options.language

  if (!shopId || !currency || !acceptedLanguage) {
    try {
      const { data } = await useStorefront().request<ShopQueryResult>(SHOP_QUERY)

      shopId ||= data?.shop?.id
      currency ||= data?.localization?.country?.currency?.isoCode
      acceptedLanguage ||= data?.localization?.language?.isoCode
    }
    catch (error) {
      createLogger().debug('Shop analytics query failed:', error)
    }
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
