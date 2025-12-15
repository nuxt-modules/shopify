import type { H3Event } from 'h3'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { createConsola } from 'consola'
import { getHeaders, readRawBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

const unauthorized = () => createError({ statusCode: 401, statusMessage: 'Unauthorized' })

/**
 * Validates an incoming Shopify webhook request by verifying its HMAC signature.
 *
 * @param event H3 event object representing the incoming request.
 *
 * @throws Will throw an unauthorized error if validation fails.
 */
export const validate = async (event: H3Event) => {
    const runtimeConfig = useRuntimeConfig()

    if (import.meta.dev) return

    const { _shopify } = runtimeConfig

    if (!_shopify?.webhooks?.secret) throw unauthorized()

    const headers = getHeaders(event)

    const shopifyHmac = headers['x-shopify-hmac-sha256']

    if (!shopifyHmac?.length) throw unauthorized()

    const body = await readRawBody(event, false)

    if (!body?.length) throw unauthorized()

    try {
        const calculatedHmacDigest = createHmac('sha256', _shopify.webhooks.secret).update(body).digest('base64')
        const isValid = timingSafeEqual(Buffer.from(calculatedHmacDigest), Buffer.from(shopifyHmac))

        if (!isValid) throw unauthorized()
    }
    catch (error) {
        createConsola()
            .withTag('shopify')
            .error('Error validating Shopify webhook HMAC signature', error)

        throw unauthorized()
    }
}
