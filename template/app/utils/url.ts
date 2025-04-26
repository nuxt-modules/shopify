export function getCollectionAppUrl(handle: string) {
    const localePath = useLocalePath()
    return localePath(`/collection/${handle}`)
}

export function getProductAppUrl(handle: string) {
    const localePath = useLocalePath()
    return localePath(`/product/${handle}`)
}

export function getAccountAppUrl() {
    const localePath = useLocalePath()
    return localePath('/account')
}

export function getCartAppUrl() {
    const localePath = useLocalePath()
    return localePath('/cart')
}
