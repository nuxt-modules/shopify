import { describe, expect, it } from 'vitest'

import { flattenConnection } from '#src/runtime/utils/functions/flattenConnection'
import { parseGid } from '#src/runtime/utils/functions/parseGid'

describe('flattenConnection', () => {
  it('unwraps an edges connection', () => {
    expect(flattenConnection({ edges: [{ node: { id: '1' } }, { node: { id: '2' } }] })).toStrictEqual([{ id: '1' }, { id: '2' }])
  })

  it('passes a nodes connection through', () => {
    expect(flattenConnection({ nodes: [{ id: '1' }] })).toStrictEqual([{ id: '1' }])
  })

  it('prefers edges when a connection carries both', () => {
    expect(flattenConnection({ edges: [{ node: { id: 'edge' } }], nodes: [{ id: 'node' }] })).toStrictEqual([{ id: 'edge' }])
  })

  it('returns an empty array for empty, missing and null connections', () => {
    expect(flattenConnection({ edges: [] })).toStrictEqual([])
    expect(flattenConnection({})).toStrictEqual([])
    expect(flattenConnection(null)).toStrictEqual([])
    expect(flattenConnection(undefined)).toStrictEqual([])
  })
})

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
