export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook('storefront:client:configure', ({ config: _config }) => {
        console.log('[shopify] storefront client config created')
    })

    nitroApp.hooks.hook('storefront:client:create', ({ client: _client }) => {
        console.log('[shopify] storefront client created')
    })

    nitroApp.hooks.hook('storefront:client:request', ({ operation: _operation, options: _options }) => {
        console.log('[shopify] storefront client request sent')
    })

    nitroApp.hooks.hook('storefront:client:response', ({ response: _response, operation: _operation, options: _options }) => {
        console.log('[shopify] storefront client received response')
    })

    nitroApp.hooks.hook('storefront:client:errors', ({ errors: _errors }) => {
        console.log('[shopify] storefront client received errors')
    })

    nitroApp.hooks.hook('admin:client:configure', ({ config: _config }) => {
        console.log('[shopify] storefront client config created')
    })

    nitroApp.hooks.hook('admin:client:create', ({ client: _client }) => {
        console.log('[shopify] storefront client created')
    })

    nitroApp.hooks.hook('admin:client:request', ({ operation: _operation, options: _options }) => {
        console.log('[shopify] storefront client request sent')
    })

    nitroApp.hooks.hook('admin:client:response', ({ response: _response, operation: _operation, options: _options }) => {
        console.log('[shopify] storefront client received response')
    })

    nitroApp.hooks.hook('admin:client:errors', ({ errors: _errors }) => {
        console.log('[shopify] storefront client received errors')
    })
})
