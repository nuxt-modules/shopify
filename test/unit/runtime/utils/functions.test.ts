import { describe, expect, it } from 'vitest'

import { parseGid } from '#src/runtime/utils/functions'

describe('parseGid', () => {
  it('extracts the numeric id from a global id', () => {
    expect(parseGid('gid://shopify/Product/1234567890')).toBe('1234567890')
    expect(parseGid('gid://shopify/HydrogenStorefront/1')).toBe('1')
  })

  it('ignores query parameters appended by the API', () => {
    expect(parseGid('gid://shopify/ProductVariant/42?namespace=custom')).toBe('42')
  })

  it('throws on anything that is not a Shopify global id', () => {
    expect(() => parseGid('1234567890')).toThrow(/invalid format/)
    expect(() => parseGid('gid://shopify/Product/')).toThrow(/invalid format/)
    expect(() => parseGid('')).toThrow(/invalid format/)
  })
})
