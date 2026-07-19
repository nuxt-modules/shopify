import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'

import { consumeBridgeNonce } from '../../../utils/customer-account/bridge'
import { setCustomerAccountSession } from '../../../utils/customer-account/session'

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  if (!import.meta.dev) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }

  const customerAccount = _shopify?.clients?.customerAccount

  if (!customerAccount) {
    throw createError({ status: 500, statusText: 'Internal Server Error', message: '[shopify] Customer account client is not configured' })
  }

  const nonce = getQuery(event).nonce

  if (typeof nonce !== 'string' || !nonce) {
    throw createError({ status: 400, statusText: 'Bad Request', message: '[shopify] Dev bridge missing nonce' })
  }

  const payload = consumeBridgeNonce(nonce)

  if (!payload) {
    throw createError({ status: 401, statusText: 'Unauthorized', message: '[shopify] Dev bridge invalid or expired nonce' })
  }

  await setCustomerAccountSession(event, {
    user: payload.user,
    tokens: payload.tokens,
    loggedInAt: Date.now(),
  })

  return sendRedirect(event, payload.returnTo ?? customerAccount.redirectURL)
})
