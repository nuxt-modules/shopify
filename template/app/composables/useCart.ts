import { useLocalStorage } from '@vueuse/core'

export async function useCart() {
    const toast = useToast()

    const id = useLocalStorage<string | null>('shopify-cart-id', null)

    const cartItems = useState<unknown[]>('cart-items', () => [])

    const first = ref(10)

    const init = async () => {
        // TODO: Init cart
    }

    const fetchCart = async () => {
        try {
            const { data: _data, error } = await useFetch('/api/cart', {
                method: 'POST',
                body: { id: id.value, lines: { first: first.value } },
            })

            if (error.value) {
                throw new Error('Failed to fetch cart')
            }
        }
        catch (error) {
            console.error(error)

            toast.add({
                title: 'Failed to fetch cart',
                description: 'Please try again later',
                color: 'error',
            })
        }
    }

    const addItems = async (...items: { merchandiseId: string, quantity: number }[]) => {
        try {
            const { data: _data, error } = await useFetch('/api/cart/add-items', {
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
        }
        catch (error) {
            if (error instanceof Error) {
                toast.add({
                    title: 'Failed to add items to cart',
                    description: error.message,
                    color: 'error',
                })
            }
        }
    }

    const removeItems = async (lineIds: string[]) => {
        try {
            const _data = await $fetch('/api/cart/remove-items', {
                method: 'POST',
                body: { id: id.value, lineIds },
            })
        }
        catch (error) {
            if (error instanceof Error) {
                toast.add({
                    title: 'Failed to remove items from cart',
                    description: error.message,
                    color: 'error',
                })
            }
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
        init,
        addItems,
        removeItems,
    }
}
