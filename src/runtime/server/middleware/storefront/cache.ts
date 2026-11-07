import { defineEventHandler } from 'h3'

import { createStorefrontServerCache } from '../../utils/storefront/cache'

export default defineEventHandler((event) => {
  event.context.shopifyStorefrontCache = createStorefrontServerCache(event)
})
