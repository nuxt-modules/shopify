import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestEvent } from '#test/helpers/event'

const SECRET = 'shpss_super_secret'

const runtimeConfig: { _shopify?: { webhooks?: { secret?: string } } } = {}

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => runtimeConfig,
}))

const debug = vi.fn()

vi.mock('#src/runtime/server/utils/log', () => ({
  createLogger: () => ({ debug, warn: vi.fn(), error: vi.fn() }),
}))

const { validate } = await import('#src/runtime/server/utils/webhooks/validation')

const createEvent = (body: string, hmac?: string) => createTestEvent({
  method: 'POST',
  path: '/api/webhooks/test',
  headers: hmac ? { 'x-shopify-hmac-sha256': hmac } : {},
  body,
})

const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(Buffer.from(body)).digest('base64')

beforeEach(() => {
  runtimeConfig._shopify = { webhooks: { secret: SECRET } }
})

describe('webhook hmac validation', () => {
  const body = JSON.stringify({ id: 1, topic: 'orders/create' })

  it('accepts a correctly signed payload', async () => {
    await expect(validate(createEvent(body, sign(body)))).resolves.toBeUndefined()
  })

  it('rejects a payload signed with a different secret', async () => {
    await expect(validate(createEvent(body, sign(body, 'wrong_secret')))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a tampered payload', async () => {
    const signature = sign(body)
    const tampered = JSON.stringify({ id: 2, topic: 'orders/create' })

    await expect(validate(createEvent(tampered, signature))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a missing signature', async () => {
    await expect(validate(createEvent(body))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a signature of the wrong length', async () => {
    await expect(validate(createEvent(body, 'short'))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects an empty body', async () => {
    await expect(validate(createEvent('', sign('')))).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects every request when no secret is configured in production', async () => {
    runtimeConfig._shopify = { webhooks: undefined }

    await expect(validate(createEvent(body, sign(body)))).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('webhook rejection logging', () => {
  const body = JSON.stringify({ id: 1, topic: 'orders/create' })

  const rejectionReason = async (event: ReturnType<typeof createEvent>) => {
    debug.mockClear()

    await validate(event).catch(() => {})

    return debug.mock.calls.map(call => String(call[0])).join('\n')
  }

  it('says why a request without a signature was rejected', async () => {
    expect(await rejectionReason(createEvent(body))).toContain('x-shopify-hmac-sha256')
  })

  it('says why a request with an empty body was rejected', async () => {
    expect(await rejectionReason(createEvent('', sign('')))).toContain('body is empty')
  })

  it('says why a request with a bad signature was rejected', async () => {
    expect(await rejectionReason(createEvent(body, sign(body, 'wrong_secret')))).toContain('does not match')
  })

  it('stays quiet for a valid request', async () => {
    expect(await rejectionReason(createEvent(body, sign(body)))).toBe('')
  })
})
