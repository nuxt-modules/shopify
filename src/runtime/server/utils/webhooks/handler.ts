import type { EventHandler, EventHandlerRequest, EventHandlerResponse } from 'h3'

import { defineEventHandler } from 'h3'
import { validate } from './validation'

export const defineWebhookEventHandler = <
    Req extends EventHandlerRequest = EventHandlerRequest,
    Res = EventHandlerResponse,
>(handler: EventHandler<Req, Res>): EventHandler => {
    return defineEventHandler(async (event) => {
        await validate(event)

        return handler(event)
    })
}
