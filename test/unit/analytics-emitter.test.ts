import { describe, expect, it, vi } from 'vitest'

import { createEmitter } from '../../src/runtime/utils/analytics/emitter'

describe('analytics emitter', () => {
  it('delivers a payload to every subscriber of an event', () => {
    const emitter = createEmitter()
    const a = vi.fn()
    const b = vi.fn()

    emitter.on('product_viewed', a)
    emitter.on('product_viewed', b)
    emitter.emit('product_viewed', { products: [] })

    expect(a).toHaveBeenCalledWith({ products: [] })
    expect(b).toHaveBeenCalledWith({ products: [] })
  })

  it('scopes delivery to the matching event', () => {
    const emitter = createEmitter()
    const listener = vi.fn()

    emitter.on('page_viewed', listener)
    emitter.emit('cart_viewed', {})

    expect(listener).not.toHaveBeenCalled()
  })

  it('stops delivering after unsubscribe', () => {
    const emitter = createEmitter()
    const listener = vi.fn()

    const off = emitter.on('page_viewed', listener)
    off()
    emitter.emit('page_viewed', {})

    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps delivering when one subscriber throws', () => {
    const emitter = createEmitter()
    const healthy = vi.fn()

    emitter.on('page_viewed', () => {
      throw new Error('boom')
    })
    emitter.on('page_viewed', healthy)

    expect(() => emitter.emit('page_viewed', {})).not.toThrow()
    expect(healthy).toHaveBeenCalledOnce()
  })
})
