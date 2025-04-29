export default defineNuxtPlugin({
    setup: (nuxtApp) => {
        nuxtApp.hooks.hook('storefront:client:create', ({ client }) => {
            console.log('storefront client created', client)
        })
    },
})
