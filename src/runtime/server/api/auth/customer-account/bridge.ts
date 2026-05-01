import { sendRedirect, getQuery, createError, defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'

import { setUserSession } from '#imports'
import { consumeBridgeNonce } from '../../../utils/customer-account/bridge'

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const nonce = getQuery(event).nonce

  if (typeof nonce !== 'string' || !nonce) {
    throw createError({ statusCode: 400, statusMessage: '[shopify] Dev bridge missing nonce' })
  }

  const payload = consumeBridgeNonce(nonce)

  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: '[shopify] Dev bridge invalid or expired nonce' })
  }

  await setUserSession(event, {
    user: payload.user,
    secure: {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    },
    loggedInAt: new Date(),
  })

  return sendRedirect(event, _shopify?.clients.customerAccount?.redirectURL || '/')
})
