import type { AnalyticsCart, CartData, CartState, CartStore } from '@shopify/hydrogen'
import type { Ref } from 'vue'

import type { ShopifyAnalyticsCart } from '../../../module'

import { EMPTY_CART_DATA, EMPTY_CART_STATE } from '@shopify/hydrogen'
import { watch } from 'vue'

export function createCartAnalyticsStore(cart: Ref<ShopifyAnalyticsCart | null>): Pick<CartStore, 'getState' | 'subscribe'> {
  const getState = (): CartState => ({
    ...EMPTY_CART_STATE,
    loading: false,
    data: (cart.value ?? EMPTY_CART_DATA) as CartData,
  })

  return {
    getState,
    subscribe: listener => watch(cart, () => listener(getState())),
  }
}

export function toAnalyticsCart(cart: ShopifyAnalyticsCart): AnalyticsCart | null {
  if (!cart.id || !cart.updatedAt) return null

  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    cost: cart.cost,
    lines: {
      nodes: cart.lines.nodes.flatMap(({ id, quantity, cost, merchandise }) => {
        const product = merchandise?.product

        if (!merchandise || typeof product?.id !== 'string' || typeof product.vendor !== 'string') return []

        return [{
          id,
          quantity,
          merchandise: {
            id: merchandise.id,
            title: merchandise.title ?? product.title,
            price: cost.amountPerQuantity,
            sku: typeof merchandise.sku === 'string' ? merchandise.sku : null,
            product: {
              id: product.id,
              title: product.title,
              vendor: product.vendor,
              productType: typeof product.productType === 'string' ? product.productType : undefined,
              handle: product.handle,
            },
          },
        }]
      }),
    },
  }
}
