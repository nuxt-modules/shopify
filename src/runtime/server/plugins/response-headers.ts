import { defineNitroPlugin } from 'nitropack/runtime'

import { applyShopifyResponseHeaders } from '../utils/routes'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', event => applyShopifyResponseHeaders(event))
})
