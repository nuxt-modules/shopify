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

            if (webhooks.length === 0) {
                log.info('No webhooks subscribed.')

                return
            }

            log.info(`Found ${webhooks.length} subscribed webhook(s):`)

            console.table(webhooks.map(hook => ({
                id: (hook as { id: string })?.id?.replace('gid://shopify/WebhookSubscription/', ''),
                topic: (hook as { topic: string })?.topic,
                uri: (hook as { endpoint: { callbackUrl: string } })?.endpoint.callbackUrl,
            })))
        }
        else if (args.action === 'subscribe') {
            const webhooks = await subscribeWebhook(config)

            if (webhooks.length === 0) {
                log.info('No new webhooks subscribed.')

                return
            }

            log.info(`Subscribed to ${webhooks.length} new webhook(s):`)

            console.table(webhooks.map(hook => ({
                id: (hook as { id: string })?.id?.replace('gid://shopify/WebhookSubscription/', ''),
                topic: (hook as { topic: string })?.topic,
                uri: (hook as { endpoint: { callbackUrl: string } })?.endpoint?.callbackUrl,
            })))
        }
        else if (args.action === 'unsubscribe') {
            const webhooks = await unsubscribeWebhook(config)

            if (webhooks.length === 0) {
                log.info('No webhooks unsubscribed.')

                return
            }

            log.info(`Unsubscribed from ${webhooks.length} webhook(s):`)

            console.table(webhooks.map(hook => ({
                id: (hook as { id: string })?.id?.replace('gid://shopify/WebhookSubscription/', ''),
                topic: (hook as { topic: string })?.topic,
                uri: (hook as { endpoint: { callbackUrl: string } })?.endpoint?.callbackUrl,
            })))
        }
        else {
            log.error(`Unknown webhook action: ${args.action}.`)
        }
    },
})
