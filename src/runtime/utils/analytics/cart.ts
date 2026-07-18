import type {
  AnalyticsEventName,
  AnalyticsEventPayload,
  ShopifyAnalyticsCart,
  ShopifyAnalyticsCartLine,
} from '../../../module'

const STORAGE_KEY = 'cartLastUpdatedAt'

type StoredUpdate = { id?: string, updatedAt?: string }

export interface CartTrackerOptions {
  publish: <E extends AnalyticsEventName>(event: E, payload: AnalyticsEventPayload<E>) => void
}

function readStoredUpdate(): StoredUpdate | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as StoredUpdate
  }
  catch {
    return null
  }
}

function storeUpdate(cart: ShopifyAnalyticsCart): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: cart.id, updatedAt: cart.updatedAt }))
  }
  catch {
    return
  }
}

export function createCartTracker({ publish }: CartTrackerOptions) {
  let prevCart: ShopifyAnalyticsCart | null = null

  const diffLines = (cart: ShopifyAnalyticsCart, previousLines: ShopifyAnalyticsCartLine[]) => {
    const currentLines = cart.lines ?? []

    for (const prevLine of previousLines) {
      const currentLine = currentLines.find(line => line.id === prevLine.id)

      if (!currentLine) {
        publish('product_removed_from_cart', { cart, prevLine })
      }
      else if (prevLine.quantity < currentLine.quantity) {
        publish('product_added_to_cart', { cart, prevLine, currentLine })
      }
      else if (prevLine.quantity > currentLine.quantity) {
        publish('product_removed_from_cart', { cart, prevLine, currentLine })
      }
    }

    for (const currentLine of currentLines) {
      if (!previousLines.some(prevLine => prevLine.id === currentLine.id)) {
        publish('product_added_to_cart', { cart, currentLine })
      }
    }
  }

  return (cart: ShopifyAnalyticsCart | null) => {
    if (!cart?.id || !cart.updatedAt) return
    if (cart.updatedAt === prevCart?.updatedAt) return

    const stored = readStoredUpdate()

    if (stored?.id === cart.id && stored?.updatedAt === cart.updatedAt) {
      prevCart = cart

      return
    }

    const previousLines = prevCart?.lines ?? []
    const previous = prevCart

    prevCart = cart

    publish('cart_updated', { cart, prevCart: previous })

    storeUpdate(cart)

    diffLines(cart, previousLines)
  }
}
