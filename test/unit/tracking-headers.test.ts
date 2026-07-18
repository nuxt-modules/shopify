import type { H3Event } from 'h3'

import { describe, expect, it } from 'vitest'

import { forwardTrackingHeaders } from '../../src/runtime/server/utils/tracking'

const SERVER_TIMING = [
  'processing;dur=12',
  'db;dur=3',
  'edge;desc="MAD"',
  'country;desc="ES"',
  'requestID;desc="52d9d6ee-ea90-4f11-91b7-f113ba4b5610"',
  '_y;desc="5a44d30f-c743-40c1-b53b-daa352476787"',
  '_s;desc="4339030a-f564-4c60-9abc-396be2d24929"',
  '_cmp;desc="3.ampS_ESCT_t_f_1zM0dBG0TB6rGIEimJnN-g"',
].join(', ')

function createEvent() {
  const appended: Array<[string, string]> = []

  const event = {
    node: {
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
  }
}

describe('forwardTrackingHeaders', () => {
  it('forwards only the tracking timings, not Shopify internals', () => {
    const { event, headersFor } = createEvent()

    forwardTrackingHeaders(event, new Headers({ 'server-timing': SERVER_TIMING }))

    const forwarded = headersFor('server-timing').join(', ')

    expect(forwarded).toContain('_y;desc="5a44d30f-c743-40c1-b53b-daa352476787"')
    expect(forwarded).toContain('_s;desc="4339030a-f564-4c60-9abc-396be2d24929"')
    expect(forwarded).toContain('_cmp;desc="3.ampS_ESCT_t_f_1zM0dBG0TB6rGIEimJnN-g"')

    expect(forwarded).not.toContain('requestID')
    expect(forwarded).not.toContain('servedBy')
    expect(forwarded).not.toContain('country')
    expect(forwarded).not.toContain('processing')
  })

  it('emits nothing when the response carries no tracking timings', () => {
    const { event, headersFor } = createEvent()

    forwardTrackingHeaders(event, new Headers({ 'server-timing': 'processing;dur=12, db;dur=3' }))

    expect(headersFor('server-timing')).toHaveLength(0)
  })

  it('does not fail when the response has no server-timing header at all', () => {
    const { event, headersFor } = createEvent()

    expect(() => forwardTrackingHeaders(event, new Headers())).not.toThrow()
    expect(headersFor('server-timing')).toHaveLength(0)
  })

  it('forwards Shopify cookies and leaves unrelated ones alone', () => {
    const { event, headersFor } = createEvent()

    const headers = new Headers()
    headers.append('set-cookie', '_shopify_analytics=abc; Path=/; HttpOnly; Secure')
    headers.append('set-cookie', '_shopify_marketing=def; Path=/; HttpOnly; Secure')
    headers.append('set-cookie', 'unrelated=xyz; Path=/')

    forwardTrackingHeaders(event, headers)

    const cookies = headersFor('set-cookie')

    expect(cookies).toHaveLength(2)
    expect(cookies.join(' ')).toContain('_shopify_analytics=abc')
    expect(cookies.join(' ')).toContain('_shopify_marketing=def')
    expect(cookies.join(' ')).not.toContain('unrelated')
  })

  it('does not forward the deprecated tracking cookies', () => {
    const { event, headersFor } = createEvent()

    const headers = new Headers()
    headers.append('set-cookie', '_shopify_y=abc; domain=shop.myshopify.com; path=/')
    headers.append('set-cookie', '_shopify_s=def; domain=shop.myshopify.com; path=/')
    headers.append('set-cookie', '_shopify_analytics=ghi; Path=/; HttpOnly')

    forwardTrackingHeaders(event, headers)

    const cookies = headersFor('set-cookie').join(' ')

    expect(cookies).toContain('_shopify_analytics=ghi')
    expect(cookies).not.toContain('_shopify_y=')
    expect(cookies).not.toContain('_shopify_s=')
  })
})
