import { describe, expect, it } from 'vitest'

import { assertSameSite } from '#src/runtime/server/utils/csrf'
import { createTestEvent } from '#test/helpers/event'

const event = (headers: Record<string, string>) => createTestEvent({ method: 'POST', headers })

describe('assertSameSite', () => {
  it.each([
    ['same-origin'],
    ['same-site'],
    ['none'],
  ])('allows a request from a %s context', (site) => {
    expect(() => assertSameSite(event({ 'sec-fetch-site': site }))).not.toThrow()
  })

  it('allows a request that does not send the fetch metadata header', () => {
    expect(() => assertSameSite(event({}))).not.toThrow()
  })

  it('rejects a cross-site request', () => {
    expect(() => assertSameSite(event({ 'sec-fetch-site': 'cross-site' })))
      .toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('rejects a cross-site request regardless of the origin header', () => {
    expect(() => assertSameSite(event({
      'sec-fetch-site': 'cross-site',
      'origin': 'https://evil.example',
    }))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('rejects a cross-site fetch even when navigation is allowed', () => {
    expect(() => assertSameSite(event({
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'cors',
    }), { allowNavigation: true })).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('allows a cross-site top level navigation when navigation is allowed', () => {
    expect(() => assertSameSite(event({
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'navigate',
    }), { allowNavigation: true })).not.toThrow()
  })

  it('still rejects a cross-site navigation when navigation is not allowed', () => {
    expect(() => assertSameSite(event({
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'navigate',
    }))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})
