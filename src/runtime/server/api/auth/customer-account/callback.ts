import { defineOAuthShopifyCustomerEventHandler, setUserSession } from '#imports'
import { sendRedirect } from 'h3'

export default defineOAuthShopifyCustomerEventHandler({
  async onSuccess(event, { user, tokens }) {
    if (!user || !tokens?.access_token || !tokens?.refresh_token) {
      console.error('[shopify] OAuth success handler called but user or tokens are missing')

      return sendRedirect(event, '/')
    }

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
    console.error('[shopify] OAuth error:', error)

    return sendRedirect(event, '/')
  },
})
