export const useCart = () => {
  const storefront = useStorefront()

  const cart = useState<CartFieldsFragment | undefined>('cart', () => undefined)
  const loading = useState('cart-loading', () => false)

  const id = useCookie<string | undefined>('cart-id', {
    path: '/',
    maxAge: 60 * 60 * 24 * 10,
    sameSite: 'lax',
    secure: !import.meta.dev,
  })

  const lines = computed(() => flattenConnection(cart.value?.lines))
  const quantity = computed(() => cart.value?.totalQuantity ?? 0)
  const total = computed(() => cart.value?.cost.totalAmount)
  const checkoutUrl = computed(() => cart.value?.checkoutUrl)

  const run = async <T>(operation: () => Promise<T>) => {
    loading.value = true

    try {
      return await operation()
    }
    finally {
      loading.value = false
    }
  }

  const get = async () => {
    if (!id.value) return

    return run(async () => {
      const { data } = await storefront.request(`#graphql
        query GetCart($id: ID!) {
          cart(id: $id) {
            ...CartFields
          }
        }
      `, { variables: { id: id.value! } })

      if (!data?.cart) id.value = undefined

      cart.value = data?.cart ?? undefined
    })
  }

  const create = async (merchandiseId: string, quantity = 1) => run(async () => {
    const { data } = await storefront.request(`#graphql
      mutation CreateCart($lines: [CartLineInput!]) {
        cartCreate(input: { lines: $lines }) {
          cart {
            ...CartFields
          }
          userErrors {
            ...CartUserErrorFields
          }
        }
      }
    `, { variables: { lines: [{ merchandiseId, quantity }] } })

    id.value = data?.cartCreate?.cart?.id
    cart.value = data?.cartCreate?.cart ?? undefined
  })

  const add = async (merchandiseId: string, quantity = 1) => {
    if (!id.value) return create(merchandiseId, quantity)

    return run(async () => {
      const { data } = await storefront.request(`#graphql
        mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart {
              ...CartFields
            }
            userErrors {
              ...CartUserErrorFields
            }
          }
        }
      `, { variables: { cartId: id.value!, lines: [{ merchandiseId, quantity }] } })

      cart.value = data?.cartLinesAdd?.cart ?? undefined
    })
  }

  const update = async (lineId: string, quantity: number) => run(async () => {
    const { data } = await storefront.request(`#graphql
      mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            ...CartFields
          }
          userErrors {
            ...CartUserErrorFields
          }
        }
      }
    `, { variables: { cartId: id.value!, lines: [{ id: lineId, quantity }] } })

    cart.value = data?.cartLinesUpdate?.cart ?? undefined
  })

  const remove = async (lineId: string) => run(async () => {
    const { data } = await storefront.request(`#graphql
      mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart {
            ...CartFields
          }
          userErrors {
            ...CartUserErrorFields
          }
        }
      }
    `, { variables: { cartId: id.value!, lineIds: [lineId] } })

    cart.value = data?.cartLinesRemove?.cart ?? undefined
  })

  return { cart, lines, quantity, total, checkoutUrl, loading, get, add, update, remove }
}
