import type { H3Event } from 'h3'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { readRawBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

import { createLogger } from '../log'
import { getWebhookHmac } from './functions'

const unauthorized = () => createError({ status: 401, statusText: 'Unauthorized' })

function hasValidSignature(secret: string, body: Buffer, signature: string): boolean {
  try {
    const calculated = Buffer.from(createHmac('sha256', secret).update(body).digest('base64'))
    const received = Buffer.from(signature)

    return calculated.length === received.length && timingSafeEqual(calculated, received)
  }
  catch (error) {
    createLogger().error('Failed to validate the webhook HMAC signature:', error)

    throw unauthorized()
  }
}

/**
 * Validates an incoming Shopify webhook request by verifying its HMAC signature.
 *
 * @param event H3 event object representing the incoming request.
 *
 * @throws Will throw an unauthorized error if validation fails.
 */
export const validate = async (event: H3Event) => {
  const { _shopify } = useRuntimeConfig(event)

  if (!_shopify?.webhooks?.secret) {
    if (!import.meta.dev) throw unauthorized()

    createLogger().warn('Skipping webhook HMAC validation: no webhook secret is configured. Requests to this handler are unauthenticated')

    return
  }

  const shopifyHmac = getWebhookHmac(event)

  if (!shopifyHmac?.length) throw unauthorized()

  const body = await readRawBody(event, false)

  if (!body?.length) throw unauthorized()

  if (!hasValidSignature(_shopify.webhooks.secret, body, shopifyHmac)) {
    createLogger().debug('Rejected a webhook request: the HMAC signature does not match')

    throw unauthorized()
  }
}
