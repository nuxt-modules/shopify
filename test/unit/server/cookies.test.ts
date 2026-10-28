import { describe, expect, it } from 'vitest'

import { forwardShopifySessionCookies, pickShopifyCookies } from '#src/runtime/server/utils/cookies'
import { createTestEvent, getResponseHeaders } from '#test/helpers/event'

describe('pickShopifyCookies', () => {
  it('never sends application cookies to Shopify', () => {
    expect(pickShopifyCookies('shopify-customer-account=secret-session; _shopify_essential=abc; cart_token=xyz; theme=dark'))
      .toBe('_shopify_essential=abc')
  })

  it('never sends application cookies whose names only end with or contain a Shopify cookie name', () => {
    expect(pickShopifyCookies('minicart=1; my_shopify_y=2; cart=gid; x_tracking_consent=3'))
      .toBe('cart=gid')
  })

  it('keeps the values of Shopify\'s cookies encoded', () => {
    expect(pickShopifyCookies('_tracking_consent=%7B%22con%22%7D; theme=dark'))
      .toBe('_tracking_consent=%7B%22con%22%7D')
  })

  it('returns nothing without a Shopify cookie', () => {
    expect(pickShopifyCookies('theme=dark')).toBeUndefined()
    expect(pickShopifyCookies(undefined)).toBeUndefined()
  })
})

describe('forwardShopifySessionCookies', () => {
  it('forwards Shopify\'s session cookies and leaves unrelated ones alone', () => {
    const event = createTestEvent()

    const headers = new Headers()

    headers.append('set-cookie', '_shopify_analytics=abc; Path=/; HttpOnly; Secure')
    headers.append('set-cookie', '_shopify_essential=def; Path=/; HttpOnly; Secure')
    headers.append('set-cookie', '_shopify_marketing=ghi; Path=/; HttpOnly; Secure')
    headers.append('set-cookie', 'unrelated=xyz; Path=/')

    forwardShopifySessionCookies(event, headers)

    expect(getResponseHeaders(event, 'set-cookie')).toStrictEqual([
      '_shopify_analytics=abc; Path=/; HttpOnly; Secure',
      '_shopify_essential=def; Path=/; HttpOnly; Secure',
      '_shopify_marketing=ghi; Path=/; HttpOnly; Secure',
    ])
  })

  it('does not forward the deprecated visitor cookies', () => {
    const event = createTestEvent()

    const headers = new Headers()

    headers.append('set-cookie', '_shopify_y=abc; domain=shop.myshopify.com; path=/')
    headers.append('set-cookie', '_shopify_s=def; domain=shop.myshopify.com; path=/')

    forwardShopifySessionCookies(event, headers)

    expect(getResponseHeaders(event, 'set-cookie')).toHaveLength(0)
  })
})
