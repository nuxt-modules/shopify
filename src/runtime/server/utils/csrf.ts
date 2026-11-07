import type { H3Event } from 'h3'

import { createError, getRequestHeader, getRequestHost, getRequestIP, getRequestURL } from 'h3'

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '::1', 'local.tryhydrogen.dev']

const LOOPBACK_ADDRESS = /^(?:127(?:\.\d{1,3}){3}|::1|::ffff:127(?:\.\d{1,3}){3})$/

function isCrossOrigin(event: H3Event): boolean {
  const origin = getRequestHeader(event, 'origin')

  if (!origin) return false

  if (origin === 'null') return true

  try {
    return new URL(origin).host !== getRequestHost(event, { xForwardedHost: true })
  }
  catch {
    return true
  }
}

export function assertSameSite(event: H3Event) {
  const site = getRequestHeader(event, 'sec-fetch-site')

  const allowed = site ? site === 'same-origin' || site === 'none' : !isCrossOrigin(event)

  if (allowed) return

  throw createError({
    status: 403,
    statusText: 'Forbidden',
    message: '[shopify] Cross-origin requests are not allowed',
  })
}

export function assertLocalRequest(event: H3Event) {
  if (LOCAL_HOSTNAMES.includes(getRequestURL(event).hostname) && LOOPBACK_ADDRESS.test(getRequestIP(event) ?? '')) return

  throw createError({
    status: 403,
    statusText: 'Forbidden',
    message: '[shopify] This endpoint is only available on localhost',
  })
}
