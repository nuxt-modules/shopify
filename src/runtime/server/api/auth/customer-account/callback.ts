import { createError, getRequestURL, sendRedirect } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { joinURL } from 'ufo'

import { defineOAuthShopifyCustomerEventHandler, setUserSession } from '#imports'
import { createBridgeNonce } from '../../../utils/customer-account/bridge'

function localConsumeUrl(bridgeURL: string, nonce: string) {
  const url = new URL(bridgeURL.includes('://') ? bridgeURL : joinURL('http://localhost:3000', bridgeURL))

  if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw createError({ statusCode: 500, statusMessage: '[shopify] Invalid dev bridge URL for customer account API' })
  }

  url.searchParams.set('nonce', nonce)

  return url.toString()
}

export default defineOAuthShopifyCustomerEventHandler({
  async onSuccess(event, { user, tokens }) {
    const { _shopify } = useRuntimeConfig(event)
    const requestURL = getRequestURL(event)

    const isDev = import.meta.dev
    const tunnelURL = _shopify?.clients.customerAccount?.dev.tunnelURL
    const bridgeURL = _shopify?.clients.customerAccount?.dev.bridgeURL
    const isTunnelHost = tunnelURL?.length && bridgeURL?.length && requestURL.toString().includes(tunnelURL)

    if (!user || !tokens?.access_token || !tokens?.refresh_token) {
      console.error('[shopify] OAuth success handler called but user or tokens are missing')

      return sendRedirect(event, '/')
    }

    if (isDev && isTunnelHost) {
      const nonce = createBridgeNonce({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.emailAddress?.emailAddress,
        },
      })

      return sendRedirect(event, localConsumeUrl(bridgeURL, nonce))
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

    return sendRedirect(event, _shopify?.clients.customerAccount?.redirectURL || '/')
  },

  onError(event, error) {
    console.error('[shopify] OAuth error:', error)

    return sendRedirect(event, '/')
  },
})
