export const useCart = () => {
  const storefront = useStorefront()
  const toast = useToast()
  const { t } = useI18n()

  const analytics = useShopifyAnalytics()

  const cart = useState<CartFieldsFragment | undefined>('shopify-cart', () => undefined)
  const loading = useState('shopify-cart-loading', () => ref(false))
  const open = useState('shopify-cart-open', () => ref(false))

  const id = useCookie<string | undefined>('shopify-cart-id', {
    path: '/',
    maxAge: 60 * 60 * 24 * 10,
    sameSite: 'lax',
    secure: !import.meta.dev,
  })

  const setCart = (value?: CartFieldsFragment) => {
    cart.value = value

    analytics.setCart(value
      ? { ...value, lines: flattenConnection(value.lines) }
      : null,
    )
  }

  const lines = computed(() => flattenConnection(cart.value?.lines))
  const checkoutUrl = computed(() => cart.value?.checkoutUrl)
  const quantity = computed(() => cart.value?.totalQuantity)
  const total = computed(() => cart.value?.cost.totalAmount)

  const setLoading = async (value: boolean) => loading.value = value

  const getAvatar = (variantId: string, lines?: CartFieldsFragment['lines']) => {
    const line = lines?.edges?.find(line => line.node.merchandise.id === variantId)

    return line?.node.merchandise.image
      ? {
          src: line.node.merchandise.image.url + '?width=88&height=88',
          alt: line.node.merchandise.image.altText || undefined,
        }
      : undefined
  }

  const notifyAdded = (variantId: string, cart?: CartFieldsFragment) => {
    setCart(cart)

    if (!open.value) toast.add({
      title: t('cart.toast.add'),
      avatar: getAvatar(variantId, cart?.lines),
      actions: [
        { label: t('cart.toast.view'), onClick: () => { open.value = true } },
      ],
      color: 'success',
      ui: { avatar: 'rounded-sm size-14' },
    })
  }

  const create = async (variantId: string, quantity = 1) => setLoading(true).then(() => storefront.request(`#graphql
    mutation CreateCart($lines: [CartLineInput!], $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
      cartCreate(input: { lines: $lines }) {
        cart {
          ...CartFields
        }
        userErrors {
          ...CartUserErrorFields
        }
      }
    }
  `, {
    variables: cartCreateInputSchema.parse({
      lines: [
        {
          merchandiseId: variantId,
          quantity,
        },
      ],
    }),
  })).then(({ data }) => {
    id.value = data?.cartCreate?.cart?.id

    notifyAdded(variantId, data?.cartCreate?.cart ?? undefined)
  }).catch(() => toast.add({
    title: t('cart.toast.error.init'),
    description: t('cart.toast.error.tryAgain'),
    color: 'error',
  })).finally(() => setLoading(false))

  const get = async () => {
    if (!id.value) return Promise.resolve()

    return setLoading(true).then(() => storefront.request(`#graphql
      query GetCart($id: ID!, $language: LanguageCode, $country: CountryCode)
      @inContext(language: $language, country: $country) {
        cart(id: $id) {
          ...CartFields
        }
      }
    `, {
      variables: cartGetInputSchema.parse({
        id: id.value,
      }),
    })).then(({ data }) => {
      if (!data?.cart) id.value = undefined

      setCart(data?.cart ?? undefined)
    }).catch(() => toast.add({
      title: t('cart.toast.error.get'),
      description: t('cart.toast.error.tryAgain'),
      color: 'error',
    })).finally(() => setLoading(false))
  }

  const add = async (variantId: string, quantity = 1) => {
    if (!id.value) return create(variantId, quantity)

    return setLoading(true).then(() => storefront.request(`#graphql
      mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!, $language: LanguageCode, $country: CountryCode)
      @inContext(language: $language, country: $country) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            ...CartFields
          }
          userErrors {
            ...CartUserErrorFields
          }
        }
      }
    `, {
      variables: cartLineInputSchema.parse({
        cartId: id.value,
        lines: [
          {
            merchandiseId: variantId,
            quantity,
          },
        ],
      }),
    })).then(({ data }) =>
      notifyAdded(variantId, data?.cartLinesAdd?.cart ?? undefined),
    ).catch(() => toast.add({
      title: t('cart.toast.error.add'),
      description: t('cart.toast.error.tryAgain'),
      color: 'error',
    })).finally(() => setLoading(false))
  }

  const update = async (variantId: string, quantity: number) => setLoading(true).then(() => storefront.request(`#graphql
    mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!, $language: LanguageCode, $country: CountryCode) 
    @inContext(language: $language, country: $country) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFields
        }
        userErrors {
          ...CartUserErrorFields
        }
      }
    }
  `, {
    variables: cartUpdateInputSchema.parse({
      cartId: id.value,
      lines: [
        {
          id: variantId,
          quantity,
        },
      ],
    }),
  })).then(({ data }) => {
    setCart(data?.cartLinesUpdate?.cart ?? undefined)

    if (!open.value) toast.add({
      title: t('cart.toast.update'),
      avatar: getAvatar(variantId, data?.cartLinesUpdate?.cart?.lines),
      actions: [
        { label: t('cart.toast.view'), onClick: () => { open.value = true } },
      ],
      color: 'success',
      ui: { avatar: 'rounded-sm size-14' },
    })
  }).catch(() => toast.add({
    title: t('cart.toast.error.update'),
    description: t('cart.toast.error.tryAgain'),
    color: 'error',
  })).finally(() => setLoading(false))

  const remove = async (variantId: string) => setLoading(true).then(() => storefront.request(`#graphql
    mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!, $language: LanguageCode, $country: CountryCode) 
    @inContext(language: $language, country: $country) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          ...CartFields
        }
        userErrors {
          ...CartUserErrorFields
        }
      }
    }
  `, {
    variables: cartRemoveInputSchema.parse({
      cartId: id.value,
      lineIds: [variantId],
    }),
  })).then(({ data }) => {
    setCart(data?.cartLinesRemove?.cart ?? undefined)

    if (!open.value) toast.add({
      title: t('cart.toast.remove'),
      actions: [
        { label: t('cart.toast.view'), onClick: () => { open.value = true } },
      ],
      color: 'success',
    })
  }).catch(() => toast.add({
    title: t('cart.toast.error.remove'),
    description: t('cart.toast.error.tryAgain'),
    color: 'error',
  })).finally(() => setLoading(false))

  return {
    open,
    loading,
    id,
    lines,
    quantity,
    total,
    checkoutUrl,

    get,
    add,
    update,
    remove,
  }
}
