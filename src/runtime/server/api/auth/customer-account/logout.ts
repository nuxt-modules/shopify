import { defineOAuthShopifyCustomerEventHandler, clearUserSession } from '#imports'
import { sendRedirect } from 'h3'

export default defineOAuthShopifyCustomerEventHandler({
  async onSuccess(event) {
    await clearUserSession(event)

    return sendRedirect(event, '/')
  },

  onError(event, error) {
    console.error('Shopify Customer OAuth error:', error)

    return sendRedirect(event, '/')
  },
})
