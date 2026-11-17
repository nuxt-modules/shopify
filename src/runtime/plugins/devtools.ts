import { defineNuxtPlugin } from '#imports'

import { postRequest } from '../utils/devtools'

export default defineNuxtPlugin({
  name: 'shopify:devtools',

  setup(nuxtApp) {
    nuxtApp.hook('shopify:storefront:client:response', params => postRequest('storefront', 'ssr', params, nuxtApp.ssrContext?.url))
    nuxtApp.hook('shopify:customer-account:client:response', params => postRequest('customer-account', 'ssr', params, nuxtApp.ssrContext?.url))
  },
})
