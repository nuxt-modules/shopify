import type { H3Event } from 'h3'

import { getRequestHeader, getRequestIP } from 'h3'

const IP_LITERAL = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[\da-f.]*:[\da-f:.]*)$/i

export function resolveBuyerIp(event: H3Event, header?: string): string | undefined {
  const value = (header ? getRequestHeader(event, header)?.split(',')[0] : getRequestIP(event))?.trim()

  return value && IP_LITERAL.test(value) ? value : undefined
}
