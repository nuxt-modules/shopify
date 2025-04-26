import { useLocalStorage } from '@vueuse/core'

export async function useCart() {
    const toast = useToast()

    const id = useLocalStorage<string | null>('shopify-cart-id', null)
    const cartItems = useState<any[]>('cart-items', () => [])
    const numItems = computed(() => {
        return cartItems.value.reduce((acc, item) => {
            return acc + item.node.quantity
        }, 0)
    })

    const first = ref(10)

    const init = async () => {
        try {
            const data = await $fetch('/api/cart/create', {
                method: 'POST',
            })

            if (!data?.cartCreate?.cart?.id) {
                throw new Error('Failed to create cart')
            }

            id.value = data.cartCreate.cart.id
        }
        catch (error) {
            id.value = null

            toast.add({
                title: 'Failed to initialize cart',
                description: 'Please try again later',
                color: 'error',
            })
        }
    }

    const fetchCart = async () => {
        try {
            const { data, error } = await useFetch('/api/cart', {
                method: 'POST',
                body: { id: id.value, lines: { first: first.value } },
            })

            if (error.value) {
                throw new Error('Failed to fetch cart')
            }

            cartItems.value = data.value?.cart?.lines?.edges || []
        }
        catch (error) {
            toast.add({
                title: 'Failed to fetch cart',
                description: 'Please try again later',
                color: 'error',
            })
        }
    }

    const addItems = async (...items: { merchandiseId: string, quantity: number }[]) => {
        try {
            const { data, error } = await useFetch('/api/cart/add-items', {
                method: 'POST',
                body: {
                    id: id.value,
                    items,
                    lines: { first: first.value },
                },
            })

            if (error.value) {
                throw new Error('Failed to add items to cart')
            }

            cartItems.value = data.value?.cartLinesAdd?.cart?.lines?.edges || []
        }
        catch (error) {
            toast.add({
                title: 'Failed to add items to cart',
                description: error.message,
                color: 'error',
            })
        }
    }

    const removeItems = async (lineIds: string[]) => {
        try {
            const { data, error } = await $fetch('/api/cart/remove-items', {
                method: 'POST',
                body: { id: id.value, lineIds },
            })

            if (error) {
                throw new Error('Failed to remove items from cart')
            }

            cartItems.value = data.value?.cartLinesRemove?.cart?.lines?.edges || []
        }
        catch (error) {
            toast.add({
                title: 'Failed to remove items from cart',
                description: error.message,
                color: 'error',
            })
        }
    }

    if (!id.value) {
        await init()
    }
    else {
        await fetchCart()
    }

    return {
        id,
        cartItems,
        numItems,
        init,
        addItems,
        removeItems,
    }
}
