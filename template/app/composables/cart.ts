import type { CartFieldsFragment } from '#shopify/storefront'

export const useCart = () => {
    const { language, country } = useLocalization()
    const storefront = useStorefront()
    const toast = useToast()
    const { t } = useI18n()

    const cart = useState<CartFieldsFragment | undefined>('shopify-cart', () => undefined)
    const open = useState('shopify-cart-open', () => ref(false))
    const id = useCookie<string>('shopify-cart-id', undefined)

    const lines = computed(() => flattenConnection(cart.value?.lines))
    const checkoutUrl = computed(() => cart.value?.checkoutUrl)
    const quantity = computed(() => cart.value?.totalQuantity)
    const total = computed(() => cart.value?.cost.totalAmount)

    const init = () => storefront.request(`#graphql
        mutation CreateCart($language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
            cartCreate {
                cart {
                    id
                }
            }
        }
    `, {
        variables: localizationParamsSchema.parse({
            language: language.value,
            country: country.value,
        }),
    }).then(({ data }) =>
        id.value = data?.cartCreate?.cart?.id ?? '',
    ).catch(() => toast.add({
        title: t('cart.toast.error.init'),
        description: t('cart.toast.error.tryAgain'),
        color: 'error',

    }))

    const get = () => storefront.request(`#graphql
        query GetCart($id: ID!, $language: LanguageCode, $country: CountryCode) 
        @inContext(language: $language, country: $country) {
            cart(id: $id) {
                ...CartFields
            }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartGetInputSchema.parse({
            id: id.value,
            language: language.value,
            country: country.value,
        }),
    }).then(({ data }) =>
        cart.value = data?.cart ?? undefined,
    ).catch(() => toast.add({
        title: t('cart.toast.error.get'),
        description: t('cart.toast.error.tryAgain'),
        color: 'error',
    }))

    const add = (variantId: string, quantity = 1) => storefront.request(`#graphql
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
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${CART_USER_ERRORS_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartLineInputSchema.parse({
            cartId: id.value,
            lines: [
                {
                    merchandiseId: variantId,
                    quantity,
                },
            ],
            language: language.value,
            country: country.value,
        }),
    }).then(({ data }) => {
        cart.value = data?.cartLinesAdd?.cart ?? undefined

        if (!open.value) toast.add({
            title: t('cart.toast.add'),
            actions: [
                { label: t('cart.toast.view'), onClick: () => { open.value = true } },
            ],
            color: 'success',
        })
    }).catch(() => toast.add({
        title: t('cart.toast.error.add'),
        description: t('cart.toast.error.tryAgain'),
        color: 'error',
    }))

    const update = (variantId: string, quantity: number) => storefront.request(`#graphql
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
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${CART_USER_ERRORS_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartUpdateInputSchema.parse({
            cartId: id.value,
            lines: [
                {
                    id: variantId,
                    quantity,
                },
            ],
            language: language.value,
            country: country.value,
        }),
    }).then(({ data }) => {
        cart.value = data?.cartLinesUpdate?.cart ?? undefined

        if (!open.value) toast.add({
            title: t('cart.toast.update'),
            actions: [
                { label: t('cart.toast.view'), onClick: () => { open.value = true } },
            ],
            color: 'success',
        })
    }).catch(() => toast.add({
        title: t('cart.toast.error.update'),
        description: t('cart.toast.error.tryAgain'),
        color: 'error',
    }))

    const remove = (variantId: string) => storefront.request(`#graphql
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
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${PRICE_FRAGMENT}
        ${CART_USER_ERRORS_FRAGMENT}
        ${PRODUCT_VARIANT_FRAGMENT}
    `, {
        variables: cartRemoveInputSchema.parse({
            cartId: id.value,
            lineIds: [variantId],
            language: language.value,
            country: country.value,
        }),
    }).then(({ data }) => {
        cart.value = data?.cartLinesRemove?.cart ?? undefined

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
    }))

    return {
        open,
        id,
        lines,
        quantity,
        total,
        checkoutUrl,

        init,
        get,
        add,
        update,
        remove,
    }
}
