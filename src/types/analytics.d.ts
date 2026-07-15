import type { Ref } from 'vue'

export type StandardAnalyticsEvent
  = | 'page_viewed'
    | 'product_viewed'
    | 'collection_viewed'
    | 'search_viewed'
    | 'cart_viewed'
    | 'product_added_to_cart'
    | 'product_removed_from_cart'
    | 'cart_updated'

export type AnalyticsEventName = StandardAnalyticsEvent | `custom_${string}`

export interface ShopAnalytics {
  shopId: string
  acceptedLanguage: string
  currency: string
  hydrogenSubchannelId: string
}

export interface AnalyticsProductInput {
  id: string
  title: string
  price: string
  vendor: string
  variantId?: string
  variantTitle?: string
  productType?: string
  sku?: string
  quantity?: number
}

export interface ShopifyAnalyticsCartLine {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    sku?: string
    price: { amount: string }
    product: {
      id: string
      title: string
      vendor: string
      productType?: string
    }
  }
}

export interface ShopifyAnalyticsCart {
  id: string
  updatedAt?: string
  totalQuantity?: number
  cost?: { totalAmount?: { amount: string, currencyCode?: string } }
  lines: ShopifyAnalyticsCartLine[]
}

export interface PageViewPayload { url?: string }
export interface ProductViewPayload { products: AnalyticsProductInput[] }
export interface CollectionViewPayload { collection: { id: string, handle?: string } }
export interface SearchViewPayload { searchTerm: string }
export interface CartViewPayload { cart?: ShopifyAnalyticsCart | null }
export interface CartLinePayload { cart: ShopifyAnalyticsCart, currentLine: ShopifyAnalyticsCartLine }
export interface CartUpdatePayload { cart: ShopifyAnalyticsCart | null, prevCart?: ShopifyAnalyticsCart | null }

export interface AnalyticsEventPayloads {
  page_viewed: PageViewPayload
  product_viewed: ProductViewPayload
  collection_viewed: CollectionViewPayload
  search_viewed: SearchViewPayload
  cart_viewed: CartViewPayload
  product_added_to_cart: CartLinePayload
  product_removed_from_cart: CartLinePayload
  cart_updated: CartUpdatePayload
}

export type AnalyticsEventPayload<E extends AnalyticsEventName>
  = E extends keyof AnalyticsEventPayloads ? AnalyticsEventPayloads[E] : Record<string, unknown>

export type AnalyticsSubscriber<E extends AnalyticsEventName = AnalyticsEventName>
  = (payload: AnalyticsEventPayload<E>) => void

export interface AnalyticsEmitter {
  on: <E extends AnalyticsEventName>(event: E, listener: AnalyticsSubscriber<E>) => () => void
  emit: <E extends AnalyticsEventName>(event: E, payload: AnalyticsEventPayload<E>) => void
}

export interface CustomerPrivacyApi {
  analyticsProcessingAllowed: () => boolean
  marketingAllowed: () => boolean
  saleOfDataAllowed: () => boolean
  preferencesProcessingAllowed?: () => boolean
  setTrackingConsent: (consent: Record<string, unknown>, callback?: (result: { error?: string }) => void) => void
  currentVisitorConsent?: () => Record<string, string>
  shouldShowBanner?: () => boolean
}

export interface PrivacyBanner {
  loadBanner: (config: Record<string, unknown>) => void
  showPreferences: (config?: Record<string, unknown>) => void
}

export interface TrackingConsent {
  analytics?: boolean
  marketing?: boolean
  preferences?: boolean
  sale_of_data?: boolean
}

export interface ShopifyAnalyticsContext {
  shop: Ref<ShopAnalytics | null>
  cart: Ref<ShopifyAnalyticsCart | null>
  setCart: (cart: ShopifyAnalyticsCart | null) => void
  canTrack: () => boolean
  publish: <E extends AnalyticsEventName>(event: E, payload: AnalyticsEventPayload<E>) => void
  subscribe: <E extends AnalyticsEventName>(event: E, callback: AnalyticsSubscriber<E>) => () => void
  setTrackingConsent: (consent: TrackingConsent, callback?: (result: { error?: string }) => void) => void
}
