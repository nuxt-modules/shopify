import { afterEach, describe, expect, it, vi } from 'vitest'

import { consumeBridgeNonce, createBridgeNonce } from '#src/runtime/server/utils/customer-account/bridge'

const payload = {
  user: { email: 'customer@example.com' } as never,
  tokens: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: Date.now() + 7200_000,
  },
}

afterEach(() => {
  vi.useRealTimers()
})

describe('customer account dev bridge store', () => {
  it('round trips the payload it was created with', () => {
    const nonce = createBridgeNonce({ ...payload, returnTo: '/account' })

    expect(consumeBridgeNonce(nonce)).toMatchObject({
      user: payload.user,
      tokens: payload.tokens,
      returnTo: '/account',
    })
  })

  it('creates a new nonce for every handoff', () => {
    expect(createBridgeNonce(payload)).not.toBe(createBridgeNonce(payload))
  })

  it('only lets a nonce be consumed once', () => {
    const nonce = createBridgeNonce(payload)

    expect(consumeBridgeNonce(nonce)).not.toBeNull()
    expect(consumeBridgeNonce(nonce)).toBeNull()
  })

  it('returns null for a nonce it never issued', () => {
    expect(consumeBridgeNonce(crypto.randomUUID())).toBeNull()
  })

  it('rejects a nonce that is older than its ttl', () => {
    vi.useFakeTimers()

    const nonce = createBridgeNonce(payload)

    vi.advanceTimersByTime(60_001)

    expect(consumeBridgeNonce(nonce)).toBeNull()
  })

  it('accepts a nonce that is still inside its ttl', () => {
    vi.useFakeTimers()

    const nonce = createBridgeNonce(payload)

    vi.advanceTimersByTime(59_000)

    expect(consumeBridgeNonce(nonce)).not.toBeNull()
  })

  it('drops an expired nonce instead of leaving the tokens in the store', () => {
    vi.useFakeTimers()

    const nonce = createBridgeNonce(payload)

    vi.advanceTimersByTime(60_001)

    expect(consumeBridgeNonce(nonce)).toBeNull()

    vi.setSystemTime(Date.now() - 60_001)

    expect(consumeBridgeNonce(nonce)).toBeNull()
  })
})
