import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestEvent } from '#test/helpers/event'
import { createLoggerStub } from '#test/helpers/logger'

const SECRET = 'shpss_super_secret'

const runtimeConfig: { _shopify?: { webhooks?: { secret?: string }, clients?: { admin?: { clientSecret?: string } } } } = {}

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

const debug = vi.fn()

vi.mock('#src/runtime/server/utils/log', () => ({
  createLogger: () => createLoggerStub({ debug }),
}))

const { validateWebhook } = await import('#src/runtime/server/utils/webhooks/validation')

const createEvent = (body: string, hmac?: string) => createTestEvent({
  method: 'POST',
  path: '/api/webhooks/test',
  headers: hmac ? { 'x-shopify-hmac-sha256': hmac } : {},
  body,
})

const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(Buffer.from(body)).digest('base64')

beforeEach(() => {
  debug.mockClear()

  runtimeConfig._shopify = { webhooks: { secret: SECRET } }
})

describe('webhook hmac validation', () => {
  const body = JSON.stringify({ id: 1, topic: 'orders/create' })

  it.each([
    ['the webhook secret', { webhooks: { secret: SECRET } }],
    ['the admin client secret when no webhook secret is set, since Shopify signs API subscriptions with it', { clients: { admin: { clientSecret: SECRET } } }],
    ['the webhook secret before the admin client secret', { webhooks: { secret: SECRET }, clients: { admin: { clientSecret: 'shpss_admin' } } }],
  ])('checks the signature with %s, quietly accepting a payload signed with it and rejecting others', async (_, config) => {
    runtimeConfig._shopify = config

    await expect(validateWebhook(createEvent(body, sign(body)))).resolves.toBeUndefined()
    expect(debug).not.toHaveBeenCalled()

    await expect(validateWebhook(createEvent(body, sign(body, 'shpss_other')))).rejects.toMatchObject({ statusCode: 401 })
  })

  it.each([
    ['a tampered payload', JSON.stringify({ id: 2, topic: 'orders/create' }), sign(body), 'does not match'],
    ['a missing signature', body, undefined, 'x-shopify-hmac-sha256'],
    ['a signature that isn\'t base64', body, '%%%not-base64%%%', 'does not match'],
    ['a signature of the wrong length', body, Buffer.from('short').toString('base64'), 'does not match'],
    ['an empty body', '', sign(''), 'body is empty'],
  ])('rejects %s, saying why', async (_, payload, signature, reason) => {
    await expect(validateWebhook(createEvent(payload, signature))).rejects.toMatchObject({ statusCode: 401 })
    expect(debug).toHaveBeenCalledWith(expect.stringContaining(reason))
  })

  it('checks the signature with Web Crypto, which every Nitro preset has, instead of Node\'s crypto module', async () => {
    const verify = vi.spyOn(crypto.subtle, 'verify')

    await validateWebhook(createEvent(body, sign(body)))

    expect(verify).toHaveBeenCalledOnce()

    verify.mockRestore()
  })

  it('rejects every request when no secret is configured in production', async () => {
    runtimeConfig._shopify = { webhooks: undefined }

    await expect(validateWebhook(createEvent(body, sign(body)))).rejects.toMatchObject({ statusCode: 401 })
  })
})
