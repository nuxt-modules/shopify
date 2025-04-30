export default defineNuxtPlugin({
    setup: (nuxtApp) => {
        nuxtApp.hooks.hook('storefront:client:create', ({ client: _client }) => {
            console.log('[shopify] storefront client created')
        })
    },
})
