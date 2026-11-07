export default defineNuxtPlugin({
  setup: (nuxtApp) => {
    nuxtApp.hooks.hook('shopify:storefront:client:configure', ({ config: _config }) => {
      console.log('[shopify] storefront client config created')
    })

    nuxtApp.hooks.hook('shopify:storefront:client:create', ({ client: _client }) => {
      console.log('[shopify] storefront client created')
    })

    nuxtApp.hooks.hook('shopify:storefront:client:request', ({ operation: _operation, options: _options }) => {
      console.log('[shopify] storefront client request sent')
    })

    nuxtApp.hooks.hook('shopify:storefront:client:response', ({ response: _response, operation: _operation, options: _options }) => {
      console.log('[shopify] storefront client received response')
    })

    nuxtApp.hooks.hook('shopify:storefront:client:errors', ({ errors: _errors }) => {
      console.log('[shopify] storefront client received errors')
    })
  },
})
