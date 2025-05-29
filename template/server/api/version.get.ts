export default defineCachedEventHandler(async () => {
    const data = await $fetch<{ tag_name?: string }>('https://api.github.com/repos/konkonam/nuxt-shopify/releases/latest')

    return data.tag_name || 'unknown'
}, {
    getKey: () => 'version',
    maxAge: 60 * 60 * 24, // Cache for 1 day
    swr: true,
})
