import { describe, expect, it } from 'vitest'

import { configObjectSchema } from '../../src/schemas'

function parseTokenStorage(tokenStorage?: unknown) {
  const config = configObjectSchema.parse({
    name: 'shop',
    clients: {
      customerAccount: {
        clientId: 'client-id',
        ...(tokenStorage === undefined ? {} : { tokenStorage }),
      },
    },
  })

  return config.clients.customerAccount?.tokenStorage
}

describe('customer account token storage', () => {
  it('defaults to cookie mode (no external storage)', () => {
    expect(parseTokenStorage()).toBe(false)
  })

  it('stays cookie mode when explicitly disabled', () => {
    expect(parseTokenStorage(false)).toBe(false)
  })

  it('uses the in-memory driver when opted in with `true`', () => {
    expect(parseTokenStorage(true)).toEqual({ driver: 'memory' })
  })

  it('accepts an external storage mount', () => {
    expect(parseTokenStorage({ driver: 'redis', url: 'redis://localhost' }))
      .toEqual({ driver: 'redis', url: 'redis://localhost' })
  })

  it('accepts a storage mount name string', () => {
    expect(parseTokenStorage('customer-account-token')).toBe('customer-account-token')
  })
})
