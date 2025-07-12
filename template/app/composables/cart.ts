export const useCart = () => {
    const cart = ref<CartLine[]>([])

    const clearCart = () => {
        cart.value = []
    }

    return {
        cart,
        clearCart,
    }
}
