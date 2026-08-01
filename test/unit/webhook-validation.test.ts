import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SECRET = 'shpss_super_secret'

const runtimeConfig: { _shopify?: { webhooks?: { secret?: string } } } = {}

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('../helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => runtimeConfig,
}))

const { validate } = await import('../../src/runtime/server/utils/webhooks/validation')

function createEvent(body: string, hmac?: string) {
  return {
    node: { req: { headers: hmac ? { 'x-shopify-hmac-sha256': hmac } : {} } },
    _requestBody: Buffer.from(body),
    method: 'POST',
    path: '/api/webhooks/test',
    headers: new Headers(hmac ? { 'x-shopify-hmac-sha256': hmac } : {}),
    web: { request: undefined },
  } as never
}

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

  it('rejects a signature of the wrong length instead of throwing', async () => {
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
