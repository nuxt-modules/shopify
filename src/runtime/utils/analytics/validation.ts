import type { ProductPayload } from '@shopify/hydrogen'

import { createLogger } from '../log'

const REQUIRED_PRODUCT_FIELDS = ['id', 'title', 'vendor', 'variantId', 'variantTitle'] as const

const REPORT_LIMIT = 64

const reported = new Set<string>()

function reportOnce(message: string) {
  if (reported.size >= REPORT_LIMIT || reported.has(message)) return

  reported.add(message)

  createLogger().warn(message)
}

export function validateProducts(products: ProductPayload[] | undefined, source: string): products is ProductPayload[] {
  if (!products?.length) {
    reportOnce(`Cannot send analytics event \`${source}\`: no products were provided`)

    return false
  }

  for (const product of products) {
    const missing = [
      ...REQUIRED_PRODUCT_FIELDS.filter(field => !product[field]),
      ...(product.price?.amount ? [] : ['price']),
    ]

    if (missing.length) {
      reportOnce(
        `Incomplete analytics event \`${source}\`: product \`${product.id || 'unknown'}\` is missing `
        + `\`${missing.join('`, `')}\`. Add the matching fields to your GraphQL query`,
      )
    }
  }

  return true
}
