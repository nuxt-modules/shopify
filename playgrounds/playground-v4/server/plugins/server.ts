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
    console.log('[shopify] admin client created')
  })

  nitroApp.hooks.hook('admin:client:request', ({ operation: _operation, options: _options }) => {
    console.log('[shopify] admin client request sent')
  })

  nitroApp.hooks.hook('admin:client:response', ({ response: _response, operation: _operation, options: _options }) => {
    console.log('[shopify] admin client received response')
  })

  nitroApp.hooks.hook('admin:client:errors', ({ errors: _errors }) => {
    console.log('[shopify] admin client received errors')
  })

  nitroApp.hooks.hook('customer-account:auth:authorize', ({ params }) => {
    params.locale = 'en'
  })

  nitroApp.hooks.hook('customer-account:auth:success', ({ user, tokens: _tokens }) => {
    console.log('[shopify] customer account login', user.email)
  })

  nitroApp.hooks.hook('customer-account:auth:refresh', ({ tokens }) => {
    console.log('[shopify] customer account token refreshed', tokens.expiresAt)
  })

  nitroApp.hooks.hook('customer-account:auth:logout', ({ user, idToken: _idToken }) => {
    console.log('[shopify] customer account logout', user?.email)
  })

  nitroApp.hooks.hook('customer-account:auth:error', ({ error }) => {
    console.error('[shopify] customer account auth error', error)
  })

  nitroApp.hooks.hook('admin:auth:request', ({ params }) => {
    console.log('[shopify] admin auth request', params.grant_type)
  })

  nitroApp.hooks.hook('admin:auth:success', ({ token }) => {
    console.log('[shopify] admin access token obtained', token.expiresAt)
  })

  nitroApp.hooks.hook('admin:auth:refresh', ({ token }) => {
    console.log('[shopify] admin access token refreshed', token.expiresAt)
  })

  nitroApp.hooks.hook('admin:auth:error', ({ error }) => {
    console.error('[shopify] admin auth error', error)
  })
})
