import type { H3Event } from 'h3'

import { readRawBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

import { createLogger } from '../log'
import { getWebhookHmac } from './functions'

const unauthorized = () => createError({ status: 401, statusText: 'Unauthorized' })

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | undefined {
  try {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0))
  }
  catch {
    return undefined
  }
}

async function hasValidSignature(secret: string, body: Uint8Array<ArrayBuffer>, signature: string): Promise<boolean> {
  const received = decodeBase64(signature)

  if (!received) return false

  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])

    return await crypto.subtle.verify('HMAC', key, received, body)
  }
  catch (error) {
    createLogger().error('Failed to validate the webhook HMAC signature:', error)

    throw unauthorized()
  }
}

/**
 * Validates an incoming Shopify webhook request by verifying its HMAC signature.
 *
 * @param event The H3Event object with the incoming request
 *
 * @throws a 401 unauthorized error if validation fails
 */
export async function validateWebhook(event: H3Event) {
  const { _shopify } = useRuntimeConfig(event)

  const secret = _shopify?.webhooks?.secret || _shopify?.clients?.admin?.clientSecret

  if (!secret) {
    if (!import.meta.dev) throw unauthorized()

    createLogger().warn('Skipping webhook HMAC validation: neither `webhooks.secret` nor the admin client\'s `clientSecret` is configured. Requests to this handler are unauthenticated')

    return
  }

  const shopifyHmac = getWebhookHmac(event)

  if (!shopifyHmac?.length) {
    createLogger().debug('Rejected a webhook request: the `x-shopify-hmac-sha256` header is missing')

    throw unauthorized()
  }

  const body = await readRawBody(event, false)

  if (!body?.length) {
    createLogger().debug('Rejected a webhook request: the request body is empty')

    throw unauthorized()
  }

  if (!await hasValidSignature(secret, new Uint8Array(body), shopifyHmac)) {
    createLogger().debug('Rejected a webhook request: the HMAC signature does not match')

    throw unauthorized()
  }
}
