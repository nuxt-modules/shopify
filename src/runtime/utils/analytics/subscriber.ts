import type { ShopifyAnalytics, ShopifyAnalyticsProduct } from '@shopify/hydrogen-react'
import type {
  AnalyticsEmitter,
  AnalyticsProductInput,
  ShopAnalytics,
  ShopifyAnalyticsCartLine,
} from '../../../module'

import {
  AnalyticsEventName,
  AnalyticsPageType,
  ShopifySalesChannel,
  getClientBrowserParameters,
  sendShopifyAnalytics,
} from '@shopify/hydrogen-react'

import { ensureShopifyCookies } from './cookies'
import { version } from '../../../../package.json'

function formatProducts(products: AnalyticsProductInput[]): ShopifyAnalyticsProduct[] {
  return products.map(product => ({
    productGid: product.id,
    variantGid: product.variantId,
    name: product.title,
    variantName: product.variantTitle,
    brand: product.vendor,
    price: product.price,
    quantity: product.quantity || 1,
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.productType ? { category: product.productType } : {}),
  }))
}

function lineToProduct(line: ShopifyAnalyticsCartLine): AnalyticsProductInput {
  return {
    id: line.merchandise.product.id,
    title: line.merchandise.product.title,
    vendor: line.merchandise.product.vendor,
    productType: line.merchandise.product.productType,
    variantId: line.merchandise.id,
    variantTitle: line.merchandise.title,
    price: line.merchandise.price.amount,
    sku: line.merchandise.sku,
    quantity: line.quantity,
  }
}

function send(eventName: string, payload: Record<string, unknown>, domain?: string) {
  void sendShopifyAnalytics({ eventName, payload } as unknown as ShopifyAnalytics, domain)
}

export function createShopifySubscriber(emitter: AnalyticsEmitter, options: {
  shop: () => ShopAnalytics | null
  domain?: string
  canTrack: () => boolean
  whenReady: (callback: () => void) => void
}) {
  const { shop, domain, canTrack, whenReady } = options

  const basePayload = (): Record<string, unknown> | null => {
    if (!canTrack()) return null

    const resolved = shop()

    if (!resolved?.shopId || !resolved.acceptedLanguage || !resolved.currency) {
      return null
    }

    ensureShopifyCookies()

    return {
      shopifySalesChannel: ShopifySalesChannel.headless,
      assetVersionId: version,
      shopId: resolved.shopId,
      currency: resolved.currency,
      acceptedLanguage: resolved.acceptedLanguage,
      hydrogenSubchannelId: resolved.hydrogenSubchannelId,
      hasUserConsent: true,
      analyticsAllowed: true,
      ...getClientBrowserParameters(),
    }
  }

  emitter.on('page_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      if (!payload) return

      const url = data?.url

      send(AnalyticsEventName.PAGE_VIEW_2, url ? { ...payload, url, path: new URL(url).pathname } : payload, domain)
    })
  })

  emitter.on('product_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      const products = data?.products

      if (!payload || !products?.length) return

      const formatted = formatProducts(products)

      send(AnalyticsEventName.PRODUCT_VIEW, {
        ...payload,
        pageType: AnalyticsPageType.product,
        resourceId: formatted[0]!.productGid,
        products: formatted,
      }, domain)
    })
  })

  emitter.on('collection_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      const collection = data?.collection

      if (!payload || !collection?.id) return

      send(AnalyticsEventName.COLLECTION_VIEW, {
        ...payload,
        pageType: AnalyticsPageType.collection,
        resourceId: collection.id,
        collectionHandle: collection.handle,
        collectionId: collection.id,
      }, domain)
    })
  })

  emitter.on('search_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      if (!payload) return

      send(AnalyticsEventName.SEARCH_VIEW, {
        ...payload,
        pageType: AnalyticsPageType.search,
        searchString: data?.searchTerm,
      }, domain)
    })
  })

  emitter.on('product_added_to_cart', (data) => {
    whenReady(() => {
      const payload = basePayload()
      const { cart, currentLine } = data ?? {}

      if (!payload || !cart?.id || !currentLine?.id) return

      send(AnalyticsEventName.ADD_TO_CART, {
        ...payload,
        cartId: cart.id,
        products: formatProducts([lineToProduct(currentLine)]),
      }, domain)
    })
  })
}
