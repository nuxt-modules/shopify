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

import { createLogger } from '../log'
import { persistTrackingTokens } from './cookies'
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
  const logger = createLogger()

  logger.debug(`Sending analytics event \`${eventName}\``)

  sendShopifyAnalytics({ eventName, payload } as unknown as ShopifyAnalytics, domain)
    .catch(error => logger.debug(`Failed to send analytics event \`${eventName}\`:`, error))
}

export function createShopifySubscriber(emitter: AnalyticsEmitter, options: {
  shop: () => ShopAnalytics | null
  domain?: string
  cookieDomain?: string
  canTrack: () => boolean
  getConsent?: () => { analyticsAllowed: boolean, marketingAllowed: boolean, saleOfDataAllowed: boolean }
  whenReady: (callback: () => void) => void
}) {
  const { shop, domain, cookieDomain, canTrack, getConsent, whenReady } = options

  const basePayload = (): Record<string, unknown> | null => {
    if (!canTrack()) return null

    const resolved = shop()

    if (!resolved?.shopId || !resolved.acceptedLanguage || !resolved.currency) {
      return null
    }

    persistTrackingTokens(cookieDomain)

    return {
      shopifySalesChannel: ShopifySalesChannel.headless,
      assetVersionId: version,
      shopId: resolved.shopId,
      currency: resolved.currency,
      acceptedLanguage: resolved.acceptedLanguage,
      hydrogenSubchannelId: resolved.hydrogenSubchannelId,
      hasUserConsent: true,
      ...(getConsent
        ? getConsent()
        : { analyticsAllowed: true, marketingAllowed: false, saleOfDataAllowed: false }),
      ...getClientBrowserParameters(),
    }
  }

  let viewPayload: Record<string, unknown> = {}

  emitter.on('page_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      if (!payload) return

      const url = data?.url
      const location = url ? { url, path: new URL(url).pathname } : {}

      send(AnalyticsEventName.PAGE_VIEW_2, { ...payload, ...location, ...viewPayload }, domain)

      viewPayload = {}
    })
  })

  emitter.on('product_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      const products = data?.products

      if (!payload || !products?.length) return

      const formatted = formatProducts(products)

      viewPayload = {
        pageType: AnalyticsPageType.product,
        resourceId: formatted[0]!.productGid,
      }

      send(AnalyticsEventName.PRODUCT_VIEW, {
        ...payload,
        ...viewPayload,
        products: formatted,
      }, domain)
    })
  })

  emitter.on('collection_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      const collection = data?.collection

      if (!payload || !collection?.id) return

      viewPayload = {
        pageType: AnalyticsPageType.collection,
        resourceId: collection.id,
      }

      send(AnalyticsEventName.COLLECTION_VIEW, {
        ...payload,
        ...viewPayload,
        collectionHandle: collection.handle,
        collectionId: collection.id,
      }, domain)
    })
  })

  emitter.on('search_viewed', (data) => {
    whenReady(() => {
      const payload = basePayload()
      if (!payload) return

      viewPayload = { pageType: AnalyticsPageType.search }

      send(AnalyticsEventName.SEARCH_VIEW, {
        ...payload,
        ...viewPayload,
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
