import type { EventHandler, EventHandlerRequest, EventHandlerResponse } from 'h3'

import { defineEventHandler } from 'h3'
import { validate } from './validation'

/**
 * Defines a webhook event handler with Shopify's HMAC validation.
 *
 * @param handler The event handler function to be wrapped.
 *
 * @returns A new event handler with validation applied.
 */
export const defineWebhookEventHandler = <
    Req extends EventHandlerRequest = EventHandlerRequest,
    Res = EventHandlerResponse,
>(handler: EventHandler<Req, Res>): EventHandler => {
    return defineEventHandler(async (event) => {
        await validate(event)

        return handler(event)
    })
}
