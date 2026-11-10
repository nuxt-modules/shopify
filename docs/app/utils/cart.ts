import type { CartServerHandlers } from '@shopify/hydrogen'

import { createCartComponents } from '@shopify/hydrogen/vue'

export const { CartProvider } = createCartComponents<CartServerHandlers>()
