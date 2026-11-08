import type { CartDataFromHandlers, CartServerHandlers } from '@shopify/hydrogen'

import { createCartComponents } from '@shopify/hydrogen/vue'

export type CartLine = CartDataFromHandlers<CartServerHandlers>['lines']['nodes'][number]

export const { CartProvider, useCart, useCartForm } = createCartComponents<CartServerHandlers>()
