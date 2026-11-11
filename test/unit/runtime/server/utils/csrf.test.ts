import { describe, expect, it } from 'vitest'

import { assertSameOrigin } from '#src/runtime/server/utils/csrf'
import { createTestEvent } from '#test/helpers/event'

const event = (headers: Record<string, string>) => createTestEvent({ method: 'POST', headers })

describe('assertSameOrigin', () => {
  it.each([
    ['from a same-origin context', { 'sec-fetch-site': 'same-origin' }],
    ['from a none context', { 'sec-fetch-site': 'none' }],
    ['that sends neither fetch metadata nor an origin', {}],
    ['from the same origin when fetch metadata is missing', { host: 'shop.example', origin: 'https://shop.example' }],
  ])('allows a request %s', (_, headers) => {
    expect(() => assertSameOrigin(event(headers))).not.toThrow()
  })

  it.each([
    ['a same-site request from a sibling subdomain', { 'sec-fetch-site': 'same-site', 'host': 'shop.example.com', 'origin': 'https://blog.example.com' }],
    ['a cross-origin request when fetch metadata is missing', { host: 'shop.example', origin: 'https://evil.example' }],
    ['an unparseable origin when fetch metadata is missing', { host: 'shop.example', origin: 'not a url' }],
    ['an opaque origin when fetch metadata is missing', { host: 'shop.example', origin: 'null' }],
    ['a cross-site request, navigations included', { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' }],
    ['a cross-site request even when its origin matches the host', { 'sec-fetch-site': 'cross-site', 'host': 'shop.example', 'origin': 'https://shop.example' }],
  ])('rejects %s', (_, headers) => {
    expect(() => assertSameOrigin(event(headers))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})
