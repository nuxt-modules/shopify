import type { ProductPayload, StorefrontAnalytics } from '@shopify/hydrogen'

import type {
  AnalyticsEventName,
  AnalyticsEventPayload,
  AnalyticsProductInput,
  AnalyticsSubscriber,
  ShopifyAnalyticsCart,
} from '../../../module'

import { createLogger } from '../log'
import { toBusCart } from './cart'

const REQUIRED_PRODUCT_FIELDS = ['id', 'title', 'price', 'vendor', 'variantId', 'variantTitle'] as const

const REPORT_LIMIT = 64

const reported = new Set<string>()

interface ViewData {
  products?: AnalyticsProductInput[]
  collection?: { id?: string, handle?: string }
  searchTerm?: string
  cart?: ShopifyAnalyticsCart | null
}

let destinationId = 0

function reportOnce(message: string) {
  if (reported.size >= REPORT_LIMIT || reported.has(message)) return

  reported.add(message)

  createLogger().warn(message)
}

export function getBus(): StorefrontAnalytics | null {
  return typeof window === 'undefined' ? null : window.Shopify?.analytics ?? null
}

function formatProducts(products: AnalyticsProductInput[], currency?: string): ProductPayload[] {
  return products.map((product) => {
    const missing = REQUIRED_PRODUCT_FIELDS.filter(field => !product[field])

    if (missing.length) {
      reportOnce(
        `Incomplete analytics event for product \`${product.id || 'unknown'}\`: missing \`${missing.join('`, `')}\`. `
        + 'Add the matching fields to your GraphQL query',
      )
    }

    return {
      id: product.id,
      title: product.title,
      vendor: product.vendor,
      variantId: product.variantId ?? '',
      variantTitle: product.variantTitle ?? '',
      quantity: product.quantity || 1,
      price: {
        amount: product.price,
        currencyCode: product.currencyCode || currency || window.Shopify?.currency?.active || '',
      },
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.productType ? { productType: product.productType } : {}),
    } as ProductPayload
  })
}

export function publishToBus<E extends AnalyticsEventName>(event: E, payload: AnalyticsEventPayload<E>, currency?: string) {
  const bus = getBus()

  if (!bus) return

  const data = (payload ?? {}) as ViewData

  switch (event) {
    case 'product_viewed': {
      if (!data.products?.length) {
        return reportOnce('Cannot send analytics event `product_viewed`: no products were provided')
      }

      return bus.publish('product_viewed', { products: formatProducts(data.products, currency) })
    }

    case 'collection_viewed': {
      if (!data.collection?.id) {
        return reportOnce('Cannot send analytics event `collection_viewed`: no collection id was provided')
      }

      return bus.publish('collection_viewed', { collection: { id: data.collection.id, handle: data.collection.handle ?? '' } })
    }

    case 'search_viewed':
      return bus.publish('search_viewed', { searchTerm: data.searchTerm ?? '' })

    case 'cart_viewed':
      return bus.publish('cart_viewed', { cart: toBusCart(data.cart, currency) })

    default:
      return bus.publish(event as never, (payload ?? {}) as never)
  }
}

export function subscribeToBus<E extends AnalyticsEventName>(event: E, callback: AnalyticsSubscriber<E>): () => void {
  const bus = getBus()

  if (!bus) return () => {}

  return bus.addDestination({
    name: `nuxt-shopify:${event}:${++destinationId}`,
    setup: ({ subscribe }) => subscribe(event as never, payload => callback(payload as never)),
  })
}
