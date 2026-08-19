import { describe, expect, it } from 'vitest'

import {
  applyDocumentTrackingHeaders,
  collectTrackingHeaders,
  createTrackingHeaders,
  extractTrackedTimings,
  UNIQUE_TOKEN_HEADER,
  VISIT_TOKEN_HEADER,
} from '#src/runtime/server/utils/tracking'
import { createTestEvent, getResponseHeader, getResponseHeaders } from '#test/helpers/event'

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
  it('creates no identifiers when Shopify already knows the session', () => {
    const event = createTestEvent()

    const headers = createTrackingHeaders(event, '_shopify_analytics=abc; other=1')

    expect(headers).not.toHaveProperty(UNIQUE_TOKEN_HEADER)
    expect(headers).not.toHaveProperty(VISIT_TOKEN_HEADER)
  })

  it('reuses a legacy session instead of starting a new one', () => {
    const event = createTestEvent()

    const headers = createTrackingHeaders(event, '_shopify_y=legacy-y; _shopify_s=legacy-s')

    expect(headers[UNIQUE_TOKEN_HEADER]).toBe('legacy-y')
    expect(headers[VISIT_TOKEN_HEADER]).toBe('legacy-s')
    expect(headers['Shopify-Storefront-Y']).toBe('legacy-y')
  })

  it('sends Shopify its own cookies back for a returning visitor', () => {
    const event = createTestEvent()

    const headers = createTrackingHeaders(event, '_shopify_analytics=abc; _shopify_essential=def')

    expect(headers.cookie).toBe('_shopify_analytics=abc; _shopify_essential=def')
  })

  it('never sends application cookies to Shopify', () => {
    const event = createTestEvent()

    const headers = createTrackingHeaders(
      event,
      'shopify-customer-account=secret-session; _shopify_analytics=abc; other=1',
    )

    expect(headers.cookie).toBe('_shopify_analytics=abc')
    expect(headers.cookie).not.toContain('secret-session')
    expect(headers.cookie).not.toContain('other=1')
  })

  it('generates identifiers for a visitor Shopify has not seen', () => {
    const event = createTestEvent()

    const headers = createTrackingHeaders(event, '')

    expect(headers[UNIQUE_TOKEN_HEADER]).toMatch(/^[0-9a-f-]{36}$/)
    expect(headers[VISIT_TOKEN_HEADER]).toMatch(/^[0-9a-f-]{36}$/)
    expect(headers[UNIQUE_TOKEN_HEADER]).not.toBe(headers[VISIT_TOKEN_HEADER])
  })
})

describe('applyDocumentTrackingHeaders', () => {
  it('sends the identifiers Shopify reported to the browser', () => {
    const event = createTestEvent()

    createTrackingHeaders(event, '')
    collectTrackingHeaders(event, shopifyResponse('_y;desc="real-y", _s;desc="real-s"'))
    applyDocumentTrackingHeaders(event)

    expect(getResponseHeader(event, 'server-timing')).toContain('_y;desc=real-y')
    expect(getResponseHeader(event, 'server-timing')).toContain('_s;desc=real-s')
    expect(getResponseHeader(event, 'server-timing')).toContain('_sfapi_proxy;desc=1')
  })

  it('falls back to the generated identifiers when no Storefront request was made', () => {
    const event = createTestEvent()

    const sent = createTrackingHeaders(event, '')
    applyDocumentTrackingHeaders(event)

    expect(getResponseHeader(event, 'server-timing')).toContain(`_y;desc=${sent[UNIQUE_TOKEN_HEADER]}`)
    expect(getResponseHeader(event, 'server-timing')).toContain(`_s;desc=${sent[VISIT_TOKEN_HEADER]}`)
  })

  it('keeps only the first response', () => {
    const event = createTestEvent()

    collectTrackingHeaders(event, shopifyResponse('_y;desc="first-y", _s;desc="first-s"'))
    collectTrackingHeaders(event, shopifyResponse('_y;desc="second-y", _s;desc="second-s"'))
    applyDocumentTrackingHeaders(event)

    expect(getResponseHeader(event, 'server-timing')).toContain('first-y')
    expect(getResponseHeader(event, 'server-timing')).not.toContain('second-y')
  })

  it('keeps looking when the first response carries no tracking values', () => {
    const event = createTestEvent()

    collectTrackingHeaders(event, shopifyResponse('processing;dur=12'))
    collectTrackingHeaders(event, shopifyResponse('_y;desc="late-y", _s;desc="late-s"'))
    applyDocumentTrackingHeaders(event)

    expect(getResponseHeader(event, 'server-timing')).toContain('late-y')
    expect(getResponseHeader(event, 'server-timing')).toContain('late-s')
  })

  it('writes at least three timing entries', () => {
    const event = createTestEvent()

    createTrackingHeaders(event, '')
    applyDocumentTrackingHeaders(event)

    expect(getResponseHeader(event, 'server-timing').split(',').length).toBeGreaterThanOrEqual(3)
  })

  it('tells the browser that tracking is resolved', () => {
    const event = createTestEvent()

    collectTrackingHeaders(event, shopifyResponse(
      '_y;desc="real-y", _s;desc="real-s", _cmp;desc="3.consent"',
      ['_shopify_essential=a; Path=/', '_shopify_analytics=b; Path=/', '_shopify_marketing=c; Path=/'],
    ))
    applyDocumentTrackingHeaders(event)

    expect(getResponseHeader(event, 'server-timing')).toContain('_server_tracking;desc=1')
    expect(getResponseHeaders(event, 'set-cookie')).toHaveLength(3)
  })

  it('does not mark tracking resolved while consent is missing', () => {
    const event = createTestEvent()

    collectTrackingHeaders(event, shopifyResponse(
      '_y;desc="real-y", _s;desc="real-s"',
      ['_shopify_essential=a; Path=/', '_shopify_analytics=b; Path=/'],
    ))
    applyDocumentTrackingHeaders(event)

    expect(getResponseHeader(event, 'server-timing')).not.toContain('_server_tracking')
  })
})
