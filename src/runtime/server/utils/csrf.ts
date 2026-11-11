import type { H3Event } from 'h3'

import { createError, getRequestHeader, getRequestHost } from 'h3'

function isCrossOrigin(event: H3Event): boolean {
  const origin = getRequestHeader(event, 'origin')

  if (!origin) return false

  try {
    return new URL(origin).host !== getRequestHost(event, { xForwardedHost: true })
  }
  catch {
    return true
  }
}

export function assertSameOrigin(event: H3Event) {
  const site = getRequestHeader(event, 'sec-fetch-site')

  const allowed = site ? site === 'same-origin' || site === 'none' : !isCrossOrigin(event)

  if (allowed) return

  throw createError({
    status: 403,
    statusText: 'Forbidden',
    message: '[shopify] Cross-origin requests are not allowed',
  })
}
