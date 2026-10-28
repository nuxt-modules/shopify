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
}

export function createTestEvent({ method = 'GET', path = '/', headers = {}, body }: TestEventInit = {}): H3Event {
  const req = new IncomingMessage(new Socket())

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

    event.context.__rawBody = raw
    ;(event as unknown as { _requestBody: Buffer })._requestBody = Buffer.from(raw)

    req.headers['content-type'] ??= 'application/json'
  }

  return event
}

export function getResponseHeaders(event: H3Event, name: string): string[] {
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

export function getResponseCookies(event: H3Event): Record<string, string> {
  return Object.fromEntries(getSetCookieHeaders(event).map((cookie) => {
    const [pair] = cookie.split(';')

    const separator = pair!.indexOf('=')

    return [pair!.slice(0, separator), decodeURIComponent(pair!.slice(separator + 1))]
  }))
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
