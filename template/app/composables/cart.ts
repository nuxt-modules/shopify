export const useCart = () => {
    const cart = ref([])

    const addToCart = (item) => {
        cart.value.push(item)
    }

    const removeFromCart = (item) => {
        cart.value = cart.value.filter(cartItem => cartItem.id !== item.id)
    }

    const clearCart = () => {
        cart.value = []
    }

    return {
        cart,
        addToCart,
        removeFromCart,
        clearCart,
    }
}
