import type { H3Event } from 'h3'

import { createError, getRequestHeader } from 'h3'

export function assertSameSite(event: H3Event, options: { allowNavigation?: boolean } = {}) {
  if (getRequestHeader(event, 'sec-fetch-site') !== 'cross-site') return

  if (options.allowNavigation && getRequestHeader(event, 'sec-fetch-mode') === 'navigate') return

  throw createError({
    status: 403,
    statusText: 'Forbidden',
    message: '[shopify] Cross-site requests are not allowed',
  })
}
