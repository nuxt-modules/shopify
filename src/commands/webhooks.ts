import type { WebhookSubscription } from '../utils/webhooks'

import { defineCommand } from 'citty'
import log from 'consola'

import { parseGid } from '../runtime/utils/functions'
import {
  getShopifyConfig,
  getSubscribedWebhooks,
  subscribeWebhooks,
  unsubscribeWebhooks,
} from '../utils/webhooks'

const ACTIONS = ['list', 'subscribe', 'unsubscribe']

const toRow = (subscription: WebhookSubscription) => ({
  id: parseGid(subscription.id),
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
      valueHint: ACTIONS.join(' | '),
      required: true,
    },
  },

  run: async ({ args }) => {
    if (!ACTIONS.includes(args.action)) {
      throw new Error(`[shopify] Unknown webhook action \`${args.action}\`: expected one of ${ACTIONS.join(', ')}`)
    }

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
      const results = await subscribeWebhooks(config)

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
    else {
      const webhooks = await unsubscribeWebhooks(config)

      if (webhooks.length === 0) {
        log.info('No webhooks unsubscribed.')

        return
      }

      log.info(`Unsubscribed from ${webhooks.length} webhook(s):`)

      console.table(webhooks.map(toRow))
    }
  },
})
