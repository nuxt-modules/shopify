import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'

import { consumeBridgeNonce } from '../../../utils/customer-account/bridge'
import { setCustomerAccountSession } from '../../../utils/customer-account/session'

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const customerAccount = _shopify?.clients?.customerAccount

  if (!customerAccount) {
    throw createError({ statusCode: 500, statusMessage: '[shopify] Customer account client is not configured' })
  }

  const nonce = getQuery(event).nonce

  if (typeof nonce !== 'string' || !nonce) {
    throw createError({ statusCode: 400, statusMessage: '[shopify] Dev bridge missing nonce' })
  }

  const payload = consumeBridgeNonce(nonce)

  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: '[shopify] Dev bridge invalid or expired nonce' })
  }

  await setCustomerAccountSession(event, {
    user: payload.user,
    tokens: payload.tokens,
    loggedInAt: Date.now(),
  })

  return sendRedirect(event, payload.returnTo ?? customerAccount.redirectURL)
})
