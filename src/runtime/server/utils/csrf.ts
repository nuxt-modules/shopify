import type { H3Event } from 'h3'

import { createError, getRequestHeader, getRequestHost } from 'h3'

function isCrossOrigin(event: H3Event): boolean {
  const origin = getRequestHeader(event, 'origin')

  if (!origin || origin === 'null') return false

  try {
    return new URL(origin).host !== getRequestHost(event, { xForwardedHost: true })
  }
  catch {
    return true
  }
}

export function assertSameSite(event: H3Event, options: { allowNavigation?: boolean } = {}) {
  const site = getRequestHeader(event, 'sec-fetch-site')

  const forbidden = () => createError({
    status: 403,
    statusText: 'Forbidden',
    message: '[shopify] Cross-site requests are not allowed',
  })

  if (site) {
    if (site !== 'cross-site') return

    if (options.allowNavigation && getRequestHeader(event, 'sec-fetch-mode') === 'navigate') return

    throw forbidden()
  }

  if (options.allowNavigation) return

  if (isCrossOrigin(event)) throw forbidden()
}
