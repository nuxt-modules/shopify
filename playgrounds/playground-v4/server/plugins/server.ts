export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('shopify:storefront:client:configure', ({ config: _config }) => {
    console.log('[shopify] storefront client config created')
  })

  nitroApp.hooks.hook('shopify:storefront:client:create', ({ client: _client }) => {
    console.log('[shopify] storefront client created')
  })

  nitroApp.hooks.hook('shopify:storefront:client:request', ({ operation: _operation, options: _options }) => {
    console.log('[shopify] storefront client request sent')
  })

  nitroApp.hooks.hook('shopify:storefront:client:response', ({ response: _response, operation: _operation, options: _options }) => {
    console.log('[shopify] storefront client received response')
  })

  nitroApp.hooks.hook('shopify:storefront:client:errors', ({ errors: _errors }) => {
    console.log('[shopify] storefront client received errors')
  })

  nitroApp.hooks.hook('shopify:admin:client:configure', ({ config: _config }) => {
    console.log('[shopify] admin client config created')
  })

  nitroApp.hooks.hook('shopify:admin:client:create', ({ client: _client }) => {
    console.log('[shopify] admin client created')
  })

  nitroApp.hooks.hook('shopify:admin:client:request', ({ operation: _operation, options: _options }) => {
    console.log('[shopify] admin client request sent')
  })

  nitroApp.hooks.hook('shopify:admin:client:response', ({ response: _response, operation: _operation, options: _options }) => {
    console.log('[shopify] admin client received response')
  })

  nitroApp.hooks.hook('shopify:admin:client:errors', ({ errors: _errors }) => {
    console.log('[shopify] admin client received errors')
  })

  nitroApp.hooks.hook('shopify:customer-account:auth:success', ({ event }) => {
    console.log('[shopify] customer account login', event.path)
  })

  nitroApp.hooks.hook('shopify:customer-account:auth:refresh', () => {
    console.log('[shopify] customer account token refreshed')
  })

  nitroApp.hooks.hook('shopify:customer-account:auth:logout', () => {
    console.log('[shopify] customer account logout')
  })

  nitroApp.hooks.hook('shopify:customer-account:auth:error', ({ event }) => {
    console.error('[shopify] customer account login failed', event.path)
  })

  nitroApp.hooks.hook('shopify:admin:auth:request', ({ params }) => {
    console.log('[shopify] admin auth request', params.grant_type)
  })

  nitroApp.hooks.hook('shopify:admin:auth:success', ({ token }) => {
    console.log('[shopify] admin access token obtained', token.expiresAt)
  })

  nitroApp.hooks.hook('shopify:admin:auth:refresh', ({ token }) => {
    console.log('[shopify] admin access token refreshed', token.expiresAt)
  })

  nitroApp.hooks.hook('shopify:admin:auth:error', ({ error }) => {
    console.error('[shopify] admin auth error', error)
  })
})
