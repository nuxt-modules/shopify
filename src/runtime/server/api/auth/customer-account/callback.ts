import { defineOAuthShopifyCustomerEventHandler, setUserSession } from '#imports'
import { sendRedirect } from 'h3'

export default defineOAuthShopifyCustomerEventHandler({
  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.emailAddress.emailAddress,
      },
      secure: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      },
      loggedInAt: new Date(),
    })

    return sendRedirect(event, '/')
  },

  onError(event, error) {
    console.error('Shopify Customer OAuth error:', error)

    return sendRedirect(event, '/')
  },
})
