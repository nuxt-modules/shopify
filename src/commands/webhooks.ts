import type { WebhookSubscription } from '../utils/webhooks'

import { defineCommand } from 'citty'
import log from 'consola'

import {
  WEBHOOK_GID_PREFIX,
  getShopifyConfig,
  getSubscribedWebhooks,
  subscribeWebhook,
  unsubscribeWebhook,
} from '../utils/webhooks'

const toRow = (subscription: WebhookSubscription) => ({
  id: subscription.id.replace(WEBHOOK_GID_PREFIX, ''),
  topic: subscription.topic,
  uri: subscription.uri,
})

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

      console.table(webhooks.map(toRow))
    }
    else if (args.action === 'subscribe') {
      const results = await subscribeWebhook(config)

      if (results.length === 0) {
        log.info('All webhooks are already up to date.')

        return
      }

      const created = results.filter(result => result.action === 'created').length
      const updated = results.length - created

      log.info([
        created ? `Created ${created} webhook(s)` : undefined,
        updated ? `Updated ${updated} webhook(s)` : undefined,
      ].filter(Boolean).join(', ') + ':')

      console.table(results.map(({ action, subscription }) => ({ action, ...toRow(subscription) })))
    }
    else if (args.action === 'unsubscribe') {
      const webhooks = await unsubscribeWebhook(config)

      if (webhooks.length === 0) {
        log.info('No webhooks unsubscribed.')

        return
      }

      log.info(`Unsubscribed from ${webhooks.length} webhook(s):`)

      console.table(webhooks.map(toRow))
    }
    else {
      log.error(`Unknown webhook action: ${args.action}.`)
    }
  },
})
