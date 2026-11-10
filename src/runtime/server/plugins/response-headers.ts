import { defineNitroPlugin } from 'nitropack/runtime'

import { applyShopifyResponseHeaders } from '../utils/request-context'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', event => applyShopifyResponseHeaders(event))
})
