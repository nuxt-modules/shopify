import type { Ref } from 'vue'
import type {
  AnalyticsCart,
  CartData,
  CartLine,
  CartLineCost,
  ConsentPreferences,
  I18nConfig,
  ShopifyScriptsI18n,
  ShopifyScriptsShop,
  StorefrontAnalytics,
} from '@shopify/hydrogen'

export type ShopifyAnalyticsShopContext = Partial<Pick<I18nConfig, 'country' | 'language'>>

export type ShopifyAnalyticsCart = Pick<CartData, 'id' | 'updatedAt'> & Pick<AnalyticsCart, 'cost'> & {
  lines: {
    nodes: Array<Pick<CartLine, 'id' | 'quantity' | 'merchandise'> & { cost: Pick<CartLineCost, 'amountPerQuantity'> }>
  }
}

export interface ShopifyAnalyticsContext {
  shop: Readonly<Ref<ShopifyScriptsShop | null>>
  i18n: Readonly<Ref<ShopifyScriptsI18n | null>>
  cart: Ref<ShopifyAnalyticsCart | null>
  setCart: (cart: ShopifyAnalyticsCart | null) => void
  publish: StorefrontAnalytics['publish']
  addDestination: StorefrontAnalytics['addDestination']
  canTrack: () => boolean
  shouldShowBanner: () => boolean
  setTrackingConsent: (consent: ConsentPreferences) => Promise<void>
  showPreferences: () => Promise<void>
  setShopContext: (context: ShopifyAnalyticsShopContext) => Promise<ShopifyScriptsI18n | null>
}
