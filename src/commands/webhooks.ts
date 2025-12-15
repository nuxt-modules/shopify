#!/usr/bin/env node

import { defineCommand } from 'citty'
import log from 'consola'

import {
    getShopifyConfig,
    getSubscribedWebhooks,
    subscribeWebhook,
    unsubscribeWebhook,
} from '../utils/webhooks'

export default defineCommand({
    meta: {
        name: 'webhooks',
        description: 'Manage Shopify webhooks',
    },

    args: {
        action: {
            type: 'positional',
            description: 'Action to perform on webhooks.',
            valueHint: 'list | subscribe | unsubscribe',
            required: true,
        },
    },

    run: async ({ args }) => {
        const config = await getShopifyConfig()

        if (args.action === 'list') {
            const webhooks = await getSubscribedWebhooks(config)

            log.info('List of subscribed Webhooks', webhooks)
        }
        else if (args.action === 'subscribe') {
            const webhooks = await subscribeWebhook(config)

            log.info('Subscribed to webhooks', webhooks)
        }
        else if (args.action === 'unsubscribe') {
            const webhooks = await unsubscribeWebhook(config)

            log.info('Unsubscribed from webhooks', webhooks)
        }
        else {
            log.error(`Unknown webhook action: ${args.action}.`)
        }
    },
})
