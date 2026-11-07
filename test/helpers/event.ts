import type { SetCookie } from 'cookie-es'
import type { H3Event } from 'h3'

import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { parse, parseSetCookie, stringifyCookie } from 'cookie-es'
import { createEvent, getRequestHeader } from 'h3'

export type TestEventInit = {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: unknown
  remoteAddress?: string
}

export function createTestEvent({ method = 'GET', path = '/', headers = {}, body, remoteAddress }: TestEventInit = {}): H3Event {
  const req = new IncomingMessage(new Socket())

  if (remoteAddress) Object.defineProperty(req.socket, 'remoteAddress', { value: remoteAddress })

  req.method = method
  req.url = path
  req.headers = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  )

  const res = new ServerResponse(req)

  const socket = new Socket()

  socket.write = () => true

  res.assignSocket(socket)

  const event = createEvent(req, res)

  if (body !== undefined) {
    const raw = typeof body === 'string' ? body : JSON.stringify(body)

    ;(event as unknown as { _requestBody: Buffer })._requestBody = Buffer.from(raw)

    req.headers['content-type'] ??= 'application/json'
  }

  return event
}

function getResponseHeaders(event: H3Event, name: string): string[] {
  const header = event.node.res.getHeader(name)

  if (Array.isArray(header)) return header.map(String)

  return header === undefined ? [] : [String(header)]
}

export function getResponseHeader(event: H3Event, name: string): string {
  return getResponseHeaders(event, name).join(', ')
}

export function getSetCookieHeaders(event: H3Event): string[] {
  return getResponseHeaders(event, 'set-cookie')
}

function isClearedCookie({ value, maxAge, expires }: SetCookie): boolean {
  return !value
    || (maxAge !== undefined && maxAge <= 0)
    || (expires !== undefined && expires.getTime() <= Date.now())
}

export function toCookieHeader(event: H3Event): string {
  const jar = new Map(Object.entries(parse(getRequestHeader(event, 'cookie') ?? '')))

  for (const header of getSetCookieHeaders(event)) {
    const cookie = parseSetCookie(header)

    if (!cookie) throw new Error(`Unparsable Set-Cookie header: ${header}`)

    if (isClearedCookie(cookie)) jar.delete(cookie.name)
    else jar.set(cookie.name, cookie.value)
  }

  return stringifyCookie(Object.fromEntries(jar))
}
