import type { trackCartAnalytics } from '@shopify/hydrogen'
import type { Ref } from 'vue'

import type { ShopifyAnalyticsCart } from '../../../module'

import { watch } from 'vue'

type CartAnalyticsStore = Parameters<typeof trackCartAnalytics>[0]

export function toBusCart(cart: ShopifyAnalyticsCart | null | undefined, currency?: string) {
  if (!cart?.id) return null

  const currencyCode = cart.cost?.totalAmount?.currencyCode || currency || ''

  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    cost: cart.cost,
    lines: {
      nodes: cart.lines.map(line => ({
        id: line.id,
        quantity: line.quantity,
        merchandise: {
          ...line.merchandise,
          price: { amount: line.merchandise.price.amount, currencyCode: line.merchandise.price.currencyCode || currencyCode },
        },
      })),
    },
  } as never
}

function toCartState(cart: ShopifyAnalyticsCart | null, currency?: string) {
  const currencyCode = cart?.cost?.totalAmount?.currencyCode || currency || ''

  return {
    data: {
      id: cart?.id,
      updatedAt: cart?.updatedAt,
      cost: cart?.cost,
      lines: {
        nodes: (cart?.lines ?? []).map(line => ({
          id: line.id,
          quantity: line.quantity,
          cost: {
            amountPerQuantity: {
              amount: line.merchandise.price.amount,
              currencyCode: line.merchandise.price.currencyCode || currencyCode,
            },
          },
          merchandise: line.merchandise,
        })),
      },
    },
    pending: { lines: new Set(), discountCodes: new Set() },
    revalidating: false,
  }
}

export function createCartAnalyticsStore(cart: Ref<ShopifyAnalyticsCart | null>, currency?: string): CartAnalyticsStore {
  const getState = () => toCartState(cart.value, currency)

  return {
    getState,
    subscribe: (listener: (state: ReturnType<typeof getState>) => void) => watch(cart, () => listener(getState())),
  } as unknown as CartAnalyticsStore
}
