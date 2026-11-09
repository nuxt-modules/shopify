import { describe, expect, it } from 'vitest'

import { assertSameSite } from '#src/runtime/server/utils/csrf'
import { createTestEvent } from '#test/helpers/event'

const event = (headers: Record<string, string>) => createTestEvent({ method: 'POST', headers })

describe('assertSameSite', () => {
  it.each([
    ['same-origin'],
    ['none'],
  ])('allows a request from a %s context', (site) => {
    expect(() => assertSameSite(event({ 'sec-fetch-site': site }))).not.toThrow()
  })

  it('rejects a same-site request from a sibling subdomain', () => {
    expect(() => assertSameSite(event({
      'sec-fetch-site': 'same-site',
      'host': 'shop.example.com',
      'origin': 'https://blog.example.com',
    }))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('allows a request that sends neither fetch metadata nor an origin', () => {
    expect(() => assertSameSite(event({}))).not.toThrow()
  })

  it('falls back to the origin when fetch metadata is missing', () => {
    expect(() => assertSameSite(event({
      host: 'shop.example',
      origin: 'https://shop.example',
    }))).not.toThrow()
  })

  it('rejects a cross-origin request when fetch metadata is missing', () => {
    expect(() => assertSameSite(event({
      host: 'shop.example',
      origin: 'https://evil.example',
    }))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('rejects an unparseable origin when fetch metadata is missing', () => {
    expect(() => assertSameSite(event({
      host: 'shop.example',
      origin: 'not a url',
    }))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('rejects an opaque origin when fetch metadata is missing', () => {
    expect(() => assertSameSite(event({ host: 'shop.example', origin: 'null' })))
      .toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('rejects a cross-site request, navigations included', () => {
    expect(() => assertSameSite(event({ 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' })))
      .toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('rejects a cross-site request even when its origin matches the host', () => {
    expect(() => assertSameSite(event({
      'sec-fetch-site': 'cross-site',
      'host': 'shop.example',
      'origin': 'https://shop.example',
    }))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})
