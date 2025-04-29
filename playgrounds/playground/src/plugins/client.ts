export default defineNuxtPlugin({
    setup: (nuxtApp) => {
        nuxtApp.hooks.hook('storefront:client:created', ({ client }) => {
            console.log('storefront client created', client)
        })
    },
})
