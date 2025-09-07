export default defineEventHandler((event) => {
    const { _shopify } = useRuntimeConfig(event)

    return _shopify
})
