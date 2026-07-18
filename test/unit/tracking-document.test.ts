import type { H3Event } from 'h3'

import { describe, expect, it } from 'vitest'

import {
  applyDocumentTrackingHeaders,
  collectTrackingHeaders,
  createTrackingHeaders,
  extractTrackedTimings,
  UNIQUE_TOKEN_HEADER,
  VISIT_TOKEN_HEADER,
} from '../../src/runtime/server/utils/tracking'

function createEvent(cookie = '') {
  const appended: Array<[string, string]> = []

  const event = {
    context: {},
    node: {
      req: { headers: cookie ? { cookie } : {} },
      res: {
        getHeader: () => undefined,
        setHeader: (name: string, value: string) => appended.push([name.toLowerCase(), value]),
        appendHeader: (name: string, value: string) => appended.push([name.toLowerCase(), value]),
        hasHeader: () => false,
      },
    },
  } as unknown as H3Event

  return {
    event,
    headersFor: (name: string) => appended.filter(([key]) => key === name).map(([, value]) => value),
    serverTiming: () => appended.filter(([key]) => key === 'server-timing').map(([, v]) => v).join(', '),
  }
}

function shopifyResponse(timings: string, cookies: string[] = []) {
  const headers = new Headers({ 'server-timing': timings })

  for (const cookie of cookies) headers.append('set-cookie', cookie)

  return headers
}

describe('extractTrackedTimings', () => {
  it('reads the tracking entries and ignores Shopify internals', () => {
    const timings = extractTrackedTimings(
      'processing;dur=12, requestID;desc="abc", _y;desc="visitor", _s;desc="visit", _cmp;desc="3.consent"',
    )

    expect(timings).toEqual({ _y: 'visitor', _s: 'visit', _cmp: '3.consent' })
  })

  it('returns nothing for an absent or unrelated header', () => {
    expect(extractTrackedTimings()).toEqual({})
    expect(extractTrackedTimings('processing;dur=12')).toEqual({})
  })
})

describe('createTrackingHeaders', () => {
  it('mints no identifiers when Shopify already identifies the session', () => {
    const { event } = createEvent()

    const headers = createTrackingHeaders(event, '_shopify_analytics=abc; other=1')

    expect(headers).not.toHaveProperty(UNIQUE_TOKEN_HEADER)
    expect(headers).not.toHaveProperty(VISIT_TOKEN_HEADER)
  })

  it('carries a legacy session forward instead of starting a new one', () => {
    const { event } = createEvent()

    const headers = createTrackingHeaders(event, '_shopify_y=legacy-y; _shopify_s=legacy-s')

    expect(headers[UNIQUE_TOKEN_HEADER]).toBe('legacy-y')
    expect(headers[VISIT_TOKEN_HEADER]).toBe('legacy-s')
    expect(headers['Shopify-Storefront-Y']).toBe('legacy-y')
  })

  it('passes Shopify its own cookies back so a returning visitor keeps one identity', () => {
    const { event } = createEvent()

    const headers = createTrackingHeaders(event, '_shopify_analytics=abc; _shopify_essential=def')

    expect(headers.cookie).toBe('_shopify_analytics=abc; _shopify_essential=def')
  })

  it('never leaks application cookies to Shopify', () => {
    const { event } = createEvent()

    const headers = createTrackingHeaders(
      event,
      'shopify-customer-account=secret-session; _shopify_analytics=abc; other=1',
    )

    expect(headers.cookie).toBe('_shopify_analytics=abc')
    expect(headers.cookie).not.toContain('secret-session')
    expect(headers.cookie).not.toContain('other=1')
  })

  it('generates identifiers for a visitor Shopify has not seen', () => {
    const { event } = createEvent()

    const headers = createTrackingHeaders(event, '')

    expect(headers[UNIQUE_TOKEN_HEADER]).toMatch(/^[0-9a-f-]{36}$/)
    expect(headers[VISIT_TOKEN_HEADER]).toMatch(/^[0-9a-f-]{36}$/)
    expect(headers[UNIQUE_TOKEN_HEADER]).not.toBe(headers[VISIT_TOKEN_HEADER])
  })
})

describe('applyDocumentTrackingHeaders', () => {
  it('hands the identifiers Shopify reported to the browser', () => {
    const { event, serverTiming } = createEvent()

    createTrackingHeaders(event, '')
    collectTrackingHeaders(event, shopifyResponse('_y;desc="real-y", _s;desc="real-s"'))
    applyDocumentTrackingHeaders(event)

    expect(serverTiming()).toContain('_y;desc=real-y')
    expect(serverTiming()).toContain('_s;desc=real-s')
    expect(serverTiming()).toContain('_sfapi_proxy;desc=1')
  })

  it('falls back to the generated identifiers when no Storefront request was made', () => {
    const { event, serverTiming } = createEvent()

    const sent = createTrackingHeaders(event, '')
    applyDocumentTrackingHeaders(event)

    expect(serverTiming()).toContain(`_y;desc=${sent[UNIQUE_TOKEN_HEADER]}`)
    expect(serverTiming()).toContain(`_s;desc=${sent[VISIT_TOKEN_HEADER]}`)
  })

  it('keeps only the first response, since one session describes the request', () => {
    const { event, serverTiming } = createEvent()

    collectTrackingHeaders(event, shopifyResponse('_y;desc="first-y", _s;desc="first-s"'))
    collectTrackingHeaders(event, shopifyResponse('_y;desc="second-y", _s;desc="second-s"'))
    applyDocumentTrackingHeaders(event)

    expect(serverTiming()).toContain('first-y')
    expect(serverTiming()).not.toContain('second-y')
  })

  it('emits at least three entries so the browser will read them', () => {
    const { event, serverTiming } = createEvent()

    createTrackingHeaders(event, '')
    applyDocumentTrackingHeaders(event)

    expect(serverTiming().split(',').length).toBeGreaterThanOrEqual(3)
  })

  it('lets the browser skip its own request once everything is resolved', () => {
    const { event, serverTiming, headersFor } = createEvent()

    collectTrackingHeaders(event, shopifyResponse(
      '_y;desc="real-y", _s;desc="real-s", _cmp;desc="3.consent"',
      ['_shopify_essential=a; Path=/', '_shopify_analytics=b; Path=/', '_shopify_marketing=c; Path=/'],
    ))
    applyDocumentTrackingHeaders(event)

    expect(serverTiming()).toContain('_server_tracking;desc=1')
    expect(headersFor('set-cookie')).toHaveLength(3)
  })

  it('does not claim resolution when consent is still missing', () => {
    const { event, serverTiming } = createEvent()

    collectTrackingHeaders(event, shopifyResponse(
      '_y;desc="real-y", _s;desc="real-s"',
      ['_shopify_essential=a; Path=/', '_shopify_analytics=b; Path=/'],
    ))
    applyDocumentTrackingHeaders(event)

    expect(serverTiming()).not.toContain('_server_tracking')
  })
})
