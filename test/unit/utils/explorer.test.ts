import { describe, expect, it } from 'vitest'

import { createTestEvent } from '#test/helpers/event'

const { assertLocalRequest } = await import('#src/utils/explorer')

describe('assertLocalRequest', () => {
  const request = (host: string, remoteAddress: string) => createTestEvent({ method: 'POST', headers: { host }, remoteAddress })

  it.each([
    ['localhost:3005', '127.0.0.1'],
    ['127.0.0.1:3005', '127.0.0.1'],
    ['[::1]:3005', '::1'],
    ['localhost:3005', '::ffff:127.0.0.1'],
    ['local.tryhydrogen.dev:5173', '127.0.0.1'],
  ])('allows a request to %s from %s', (host, remoteAddress) => {
    expect(() => assertLocalRequest(request(host, remoteAddress))).not.toThrow()
  })

  it.each([
    ['abc123.ngrok.app', '127.0.0.1'],
    ['shop.example.com', '127.0.0.1'],
    ['192.168.1.20:3005', '192.168.1.20'],
    ['localhost:3005', '192.168.1.20'],
  ])('rejects a request to %s from %s', (host, remoteAddress) => {
    expect(() => assertLocalRequest(request(host, remoteAddress))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})
