import type { ProductPayload, StorefrontAnalytics } from '@shopify/hydrogen'

import type { AnalyticsEmitter, AnalyticsProductInput } from '../../../module'

import { createLogger } from '../log'

const REQUIRED_PRODUCT_FIELDS = ['id', 'title', 'price', 'vendor', 'variantId', 'variantTitle'] as const

const REPORT_LIMIT = 64

const reported = new Set<string>()

function reportOnce(message: string) {
  if (reported.size >= REPORT_LIMIT || reported.has(message)) return

  reported.add(message)

  createLogger().warn(message)
}

function getBus(): StorefrontAnalytics | null {
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

export function forwardToBus(emitter: AnalyticsEmitter, options: { currency?: string } = {}) {
  const currency = options.currency?.toUpperCase()

  emitter.on('product_viewed', (data) => {
    const bus = getBus()
    const products = data?.products

    if (!bus) return

    if (!products?.length) {
      reportOnce('Cannot send analytics event `product_viewed`: no products were provided')

      return
    }

    bus.publish('product_viewed', { products: formatProducts(products, currency) })
  })

  emitter.on('collection_viewed', (data) => {
    const bus = getBus()
    const collection = data?.collection

    if (!bus) return

    if (!collection?.id) {
      reportOnce('Cannot send analytics event `collection_viewed`: no collection id was provided')

      return
    }

    bus.publish('collection_viewed', { collection: { id: collection.id, handle: collection.handle ?? '' } })
  })

  emitter.on('search_viewed', (data) => {
    getBus()?.publish('search_viewed', { searchTerm: data?.searchTerm ?? '' })
  })
}
