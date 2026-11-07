import type { AnalyticsCart, CartData, CartState } from '@shopify/hydrogen'

export function isCartSettled({ loading, pending, revalidating }: CartState): boolean {
  const pendingCost = pending.cost ?? (pending.lines.size > 0 || pending.discountCodes.size > 0)

  return !loading && !revalidating && !pendingCost && !pending.note && !pending.attributes
}

export function toAnalyticsCart(cart: CartData): AnalyticsCart | null {
  if (!cart.id) return null

  return {
    id: cart.id,
    updatedAt: cart.updatedAt ?? new Date().toISOString(),
    cost: cart.cost,
    lines: {
      nodes: cart.lines.nodes.flatMap(({ id, quantity, cost, merchandise }) => {
        if (!merchandise?.product) return []

        const { product } = merchandise

        return [{
          id,
          quantity,
          merchandise: {
            id: merchandise.id,
            title: merchandise.title ?? product.title,
            price: cost.amountPerQuantity,
            sku: typeof merchandise.sku === 'string' ? merchandise.sku : null,
            product: {
              id: typeof product.id === 'string' ? product.id : '',
              title: product.title,
              vendor: typeof product.vendor === 'string' ? product.vendor : '',
              productType: typeof product.productType === 'string' ? product.productType : undefined,
              handle: product.handle,
            },
          },
        }]
      }),
    },
  }
}
