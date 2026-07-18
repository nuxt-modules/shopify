import type { H3Event } from 'h3'

import { appendResponseHeader, getRequestHeader } from 'h3'

export const UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken'
export const VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken'
const LEGACY_UNIQUE_TOKEN_HEADER = 'Shopify-Storefront-Y'
const LEGACY_VISIT_TOKEN_HEADER = 'Shopify-Storefront-S'

const TRACKED_TIMINGS = ['_y', '_s', '_cmp'] as const

const SFAPI_PROXY_KEY = '_sfapi_proxy'
const SERVER_TRACKING_KEY = '_server_tracking'

const FORWARDED_COOKIES = ['_shopify_analytics', '_shopify_marketing', '_shopify_essential']

const CONTEXT_KEY = '_shopifyTracking'

export type TrackedTimings = Partial<Record<typeof TRACKED_TIMINGS[number], string>>

type TrackingState = {
  resolved?: boolean
  uniqueToken?: string
  visitToken?: string
  legacyUniqueToken?: string
  legacyVisitToken?: string
  serverTiming?: string
  setCookie: string[]
}

function useTrackingState(event: H3Event): TrackingState {
  const context = event.context as Record<string, unknown>

  context[CONTEXT_KEY] ??= { setCookie: [] } satisfies TrackingState

  return context[CONTEXT_KEY] as TrackingState
}

export function extractTrackedTimings(serverTiming?: string): TrackedTimings {
  const timings: TrackedTimings = {}

  if (!serverTiming) return timings

  const pattern = new RegExp(`\\b(${TRACKED_TIMINGS.join('|')});desc="?([^",]+)"?`, 'g')

  let match: RegExpExecArray | null

  while ((match = pattern.exec(serverTiming)) !== null) {
    timings[match[1] as keyof TrackedTimings] = match[2]
  }

  return timings
}

function buildServerTiming(values: Record<string, string | undefined>): string {
  return Object.entries(values)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key};desc=${value}`)
    .join(', ')
}

function appendServerTiming(event: H3Event, values: Record<string, string | undefined>): void {
  const header = buildServerTiming(values)

  if (header) appendResponseHeader(event, 'server-timing', header)
}

function resolveTokens(event: H3Event, cookie: string): TrackingState {
  const state = useTrackingState(event)

  if (state.resolved) return state

  state.resolved = true

  if (/\b_shopify_(?:analytics|marketing)=/.test(cookie)) return state

  state.legacyUniqueToken = cookie.match(/\b_shopify_y=([^;]+)/)?.[1]
  state.legacyVisitToken = cookie.match(/\b_shopify_s=([^;]+)/)?.[1]

  state.uniqueToken = state.legacyUniqueToken ?? crypto.randomUUID()
  state.visitToken = state.legacyVisitToken ?? crypto.randomUUID()

  return state
}

export function forwardableCookie(cookie: string): string | undefined {
  const shopifyCookies = cookie
    .split(';')
    .map(entry => entry.trim())
    .filter(entry => entry.startsWith('_shopify_'))

  return shopifyCookies.length ? shopifyCookies.join('; ') : undefined
}

export function createTrackingHeaders(event: H3Event, cookie = ''): Record<string, string> {
  const state = resolveTokens(event, cookie)
  const forwarded = forwardableCookie(cookie)

  return {
    ...(forwarded ? { cookie: forwarded } : {}),
    ...(state.uniqueToken && state.visitToken
      ? {
          [UNIQUE_TOKEN_HEADER]: state.uniqueToken,
          [VISIT_TOKEN_HEADER]: state.visitToken,
          ...(state.legacyUniqueToken ? { [LEGACY_UNIQUE_TOKEN_HEADER]: state.legacyUniqueToken } : {}),
          ...(state.legacyVisitToken ? { [LEGACY_VISIT_TOKEN_HEADER]: state.legacyVisitToken } : {}),
        }
      : {}),
  }
}

export function collectTrackingHeaders(event: H3Event, headers?: Headers): void {
  if (!headers) return

  const state = useTrackingState(event)

  const serverTiming = headers.get('server-timing')

  if (serverTiming && !state.serverTiming && Object.keys(extractTrackedTimings(serverTiming)).length) {
    state.serverTiming = serverTiming
  }

  if (!state.setCookie.length && typeof headers.getSetCookie === 'function') {
    state.setCookie = headers.getSetCookie()
  }
}

function forwardCookies(event: H3Event, cookies: string[]): string[] {
  const forwarded = cookies.filter(cookie =>
    FORWARDED_COOKIES.some(name => cookie.startsWith(`${name}=`)),
  )

  for (const cookie of forwarded) {
    appendResponseHeader(event, 'set-cookie', cookie)
  }

  return forwarded
}

export function applyDocumentTrackingHeaders(event: H3Event): void {
  const state = resolveTokens(event, getRequestHeader(event, 'cookie') ?? '')

  const forwarded = forwardCookies(event, state.setCookie)
  const collected = extractTrackedTimings(state.serverTiming)

  appendServerTiming(event, {
    _y: state.uniqueToken,
    _s: state.visitToken,
    ...collected,
    [SFAPI_PROXY_KEY]: '1',
  })

  if (forwarded.length > 1 && collected._y && collected._s && collected._cmp) {
    appendServerTiming(event, { [SERVER_TRACKING_KEY]: '1' })
  }
}

export function forwardTrackingHeaders(event: H3Event, headers: Headers): void {
  const serverTiming = headers.get('server-timing')

  if (serverTiming) {
    const tracked = serverTiming
      .split(',')
      .map(entry => entry.trim())
      .filter(entry => TRACKED_TIMINGS.some(name => entry.startsWith(`${name};`)))

    if (tracked.length) {
      appendResponseHeader(event, 'server-timing', tracked.join(', '))
    }
  }

  forwardCookies(event, typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [])
}
