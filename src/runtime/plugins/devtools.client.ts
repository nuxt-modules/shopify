import type { ShopifyDevtoolsRequest } from '../utils/devtools'

import { defineNuxtPlugin } from '#imports'

import { DEVTOOLS_EVENT, toDevtoolsRequest } from '../utils/devtools'

export default defineNuxtPlugin({
  name: 'shopify:devtools:browser',

  setup(nuxtApp) {
    const send = (request: ShopifyDevtoolsRequest) => import.meta.hot?.send(DEVTOOLS_EVENT, request)

    nuxtApp.hook('shopify:storefront:client:response', params => send(toDevtoolsRequest('storefront', 'browser', params, location.pathname + location.search)))
    nuxtApp.hook('shopify:customer-account:client:response', params => send(toDevtoolsRequest('customer-account', 'browser', params, location.pathname + location.search)))
  },
})
