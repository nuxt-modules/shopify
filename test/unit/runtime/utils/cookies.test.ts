import { describe, expect, it } from 'vitest'

import { pickShopifyCookies } from '#src/runtime/utils/cookies'

describe('pickShopifyCookies', () => {
  it('never sends application cookies to Shopify', () => {
    expect(pickShopifyCookies('__Host-session=secret-session; _shopify_essential=abc; cart_token=xyz; theme=dark'))
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
