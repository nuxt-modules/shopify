import { defineNitroPlugin } from 'nitropack/runtime'

import { postRequest } from '../../utils/devtools'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('shopify:storefront:client:response', params => postRequest('storefront', 'server', params))
  nitroApp.hooks.hook('shopify:customer-account:client:response', params => postRequest('customer-account', 'server', params))
  nitroApp.hooks.hook('shopify:admin:client:response', params => postRequest('admin', 'server', params))
})
