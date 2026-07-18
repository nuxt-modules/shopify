import type { ShopifyAnalytics, ShopifyAnalyticsProduct } from '@shopify/hydrogen-react'
import type {
  AnalyticsConsentFlags,
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

const MAX_QUEUED_EVENTS = 20

const REQUIRED_SHOP_FIELDS = ['shopId', 'acceptedLanguage', 'currency', 'hydrogenSubchannelId'] as const
const REQUIRED_PRODUCT_FIELDS = ['id', 'title', 'price', 'vendor', 'variantId', 'variantTitle'] as const

const reported = new Set<string>()

function reportOnce(message: string) {
  if (reported.has(message)) return

  reported.add(message)

  createLogger().warn(message)
}

function validateShop(shop: ShopAnalytics | null): shop is ShopAnalytics {
  const missing = REQUIRED_SHOP_FIELDS.filter(field => !shop?.[field])

  if (!missing.length) return true

  reportOnce(
    `Cannot send analytics events: the shop is missing \`${missing.join('`, `')}\`. `
    + 'Set them under `shopify.analytics` or make sure the storefront client can reach the Shopify API',
  )

  return false
}

function validateProducts(products: AnalyticsProductInput[] | undefined, source: string): products is AnalyticsProductInput[] {
  if (!products?.length) {
    reportOnce(`Cannot send analytics event \`${source}\`: no products were provided`)

    return false
  }

  for (const product of products) {
    const missing = REQUIRED_PRODUCT_FIELDS.filter(field => !product[field])

    if (missing.length) {
      reportOnce(
        `Incomplete analytics event \`${source}\`: product \`${product.id || 'unknown'}\` is missing `
        + `\`${missing.join('`, `')}\`. Add the matching fields to your GraphQL query`,
      )
    }
  }

  return true
}

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
  getConsent?: () => AnalyticsConsentFlags
  whenReady: (callback: () => void) => void
}) {
  const { shop, domain, cookieDomain, canTrack, getConsent, whenReady } = options

  const basePayload = (): Record<string, unknown> | null => {
    const resolved = shop()

    if (!validateShop(resolved)) return null

    persistTrackingTokens(cookieDomain)

    return {
      shopifySalesChannel: ShopifySalesChannel.headless,
      assetVersionId: version,
      shopId: resolved.shopId,
      currency: resolved.currency,
      acceptedLanguage: resolved.acceptedLanguage,
      hydrogenSubchannelId: resolved.hydrogenSubchannelId,
      hasUserConsent: canTrack(),
      ...(getConsent?.() ?? {
        analyticsAllowed: true,
        marketingAllowed: false,
        saleOfDataAllowed: false,
        ccpaEnforced: true,
        gdprEnforced: true,
      }),
      ...getClientBrowserParameters(),
    }
  }

  const queue: Array<() => void> = []

  const flush = () => {
    const queued = queue.splice(0)

    if (!canTrack()) return

    for (const run of queued) run()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visitorConsentCollected', flush)
  }

  const track = (build: (payload: Record<string, unknown>) => void) => {
    const run = () => {
      const payload = basePayload()

      if (payload) build(payload)
    }

    whenReady(() => {
      if (canTrack()) return run()

      if (queue.length < MAX_QUEUED_EVENTS) queue.push(run)
    })
  }

  let viewPayload: Record<string, unknown> = {}

  emitter.on('page_viewed', (data) => {
    track((payload) => {
      const url = data?.url
      const location = url ? { url, path: new URL(url).pathname } : {}

      send(AnalyticsEventName.PAGE_VIEW_2, { ...payload, ...location, ...viewPayload }, domain)

      viewPayload = {}
    })
  })

  emitter.on('product_viewed', (data) => {
    track((payload) => {
      const products = data?.products

      if (!validateProducts(products, 'product_viewed')) return

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
    track((payload) => {
      const collection = data?.collection

      if (!collection?.id) {
        reportOnce('Cannot send analytics event `collection_viewed`: no collection id was provided')

        return
      }

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
    track((payload) => {
      viewPayload = { pageType: AnalyticsPageType.search }

      send(AnalyticsEventName.SEARCH_VIEW, {
        ...payload,
        ...viewPayload,
        searchString: data?.searchTerm,
      }, domain)
    })
  })

  emitter.on('product_added_to_cart', (data) => {
    track((payload) => {
      const { cart, currentLine } = data ?? {}

      if (!cart?.id || !currentLine?.id) return

      const products = [lineToProduct(currentLine)]

      validateProducts(products, 'product_added_to_cart')

      send(AnalyticsEventName.ADD_TO_CART, {
        ...payload,
        cartId: cart.id,
        products: formatProducts(products),
      }, domain)
    })
  })
}
