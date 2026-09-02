import type { AdminApiClient } from '@nuxtjs/shopify/admin'

import type { ShopifyConfig } from '../types'

import { loadNuxt } from '@nuxt/kit'

import { createAdminClient } from '../runtime/utils/clients/admin'
import { flattenConnection } from '../runtime/utils/functions/flattenConnection'

const PAGE_SIZE = 250

export const WEBHOOK_GID_PREFIX = 'gid://shopify/WebhookSubscription/'

type WebhookConfig = NonNullable<NonNullable<ShopifyConfig['webhooks']>['hooks']>[number]

type MetafieldIdentifier = {
  key: string
  namespace?: string | null
}

export interface WebhookSubscription {
  id: string
  topic: string
  uri: string
  format: 'JSON' | 'XML'
  filter?: string | null
  includeFields: string[]
  metafieldNamespaces: string[]
  metafields: MetafieldIdentifier[]
}

interface WebhookSubscriptionResult {
  action: 'created' | 'updated'
  subscription: WebhookSubscription
}

const SUBSCRIPTION_FIELDS = `
  id
  topic
  uri
  format
  filter
  includeFields
  metafieldNamespaces
  metafields {
    key
    namespace
  }
`

const toInput = (hook: WebhookConfig) => ({
  uri: hook.uri,
  format: hook.format ?? 'JSON',
  filter: hook.filter,
  includeFields: hook.includeFields,
  metafieldNamespaces: hook.metafieldNamespaces,
  metafields: hook.metafields,
})

function sameList(left: readonly string[] = [], right: readonly string[] = []) {
  if (left.length !== right.length) return false

  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()

  return sortedLeft.every((value, index) => value === sortedRight[index])
}

const metafieldKeys = (metafields: readonly MetafieldIdentifier[] = []) =>
  metafields.map(({ namespace, key }) => `${namespace ?? ''}/${key}`)

function isUpToDate(subscription: WebhookSubscription, hook: WebhookConfig) {
  return subscription.format === (hook.format ?? 'JSON')
    && (subscription.filter ?? undefined) === hook.filter
    && sameList(subscription.includeFields, hook.includeFields)
    && sameList(subscription.metafieldNamespaces, hook.metafieldNamespaces)
    && sameList(metafieldKeys(subscription.metafields), metafieldKeys(hook.metafields))
}

const matches = (subscription: WebhookSubscription, hook: WebhookConfig) =>
  subscription.topic === hook.topic && subscription.uri === hook.uri

const fetchSubscriptions = async (client: AdminApiClient) => {
  const subscriptions: WebhookSubscription[] = []

  let after: string | undefined

  do {
    const { data, errors } = await client.request(`#graphql
      query GetWebhookSubscriptions($first: Int!, $after: String) {
        webhookSubscriptions(first: $first, after: $after) {
          edges {
            node {
              ${SUBSCRIPTION_FIELDS}
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      variables: {
        first: PAGE_SIZE,
        after,
      },
    })

    if (errors) {
      throw new Error(`[shopify] Failed to fetch webhook subscriptions: ${JSON.stringify(errors, null, 2)}`)
    }

    subscriptions.push(...flattenConnection<WebhookSubscription>(data?.webhookSubscriptions))

    const pageInfo = data?.webhookSubscriptions?.pageInfo

    after = pageInfo?.hasNextPage ? pageInfo.endCursor ?? undefined : undefined
  } while (after)

  return subscriptions
}

const createSubscription = async (client: AdminApiClient, hook: WebhookConfig) => {
  const { data, errors } = await client.request(`#graphql
    mutation WebhookSubscriptionCreate(
      $topic: WebhookSubscriptionTopic!,
      $webhookSubscription: WebhookSubscriptionInput!
    ) {
      webhookSubscriptionCreate(
        topic: $topic,
        webhookSubscription: $webhookSubscription
      ) {
        webhookSubscription {
          ${SUBSCRIPTION_FIELDS}
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      topic: hook.topic,
      webhookSubscription: toInput(hook),
    },
  })

  if (errors) {
    throw new Error(`[shopify] Failed to create webhook subscription: ${JSON.stringify(errors, null, 2)}`)
  }

  if (data?.webhookSubscriptionCreate.userErrors.length) {
    throw new Error(`[shopify] Failed to create webhook subscription: ${JSON.stringify(data.webhookSubscriptionCreate.userErrors, null, 2)}`)
  }

  return data?.webhookSubscriptionCreate.webhookSubscription as WebhookSubscription | undefined
}

const updateSubscription = async (client: AdminApiClient, id: string, hook: WebhookConfig) => {
  const { data, errors } = await client.request(`#graphql
    mutation WebhookSubscriptionUpdate(
      $id: ID!,
      $webhookSubscription: WebhookSubscriptionInput!
    ) {
      webhookSubscriptionUpdate(
        id: $id,
        webhookSubscription: $webhookSubscription
      ) {
        webhookSubscription {
          ${SUBSCRIPTION_FIELDS}
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      id,
      webhookSubscription: toInput(hook),
    },
  })

  if (errors) {
    throw new Error(`[shopify] Failed to update webhook subscription: ${JSON.stringify(errors, null, 2)}`)
  }

  if (data?.webhookSubscriptionUpdate.userErrors.length) {
    throw new Error(`[shopify] Failed to update webhook subscription: ${JSON.stringify(data.webhookSubscriptionUpdate.userErrors, null, 2)}`)
  }

  return data?.webhookSubscriptionUpdate.webhookSubscription as WebhookSubscription | undefined
}

const deleteSubscription = async (client: AdminApiClient, id: string) => {
  const { data, errors } = await client.request(`#graphql
    mutation WebhookSubscriptionDelete($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      id,
    },
  })

  if (errors) {
    throw new Error(`[shopify] Failed to delete webhook subscription: ${JSON.stringify(errors, null, 2)}`)
  }

  if (data?.webhookSubscriptionDelete.userErrors.length) {
    throw new Error(`[shopify] Failed to delete webhook subscription: ${JSON.stringify(data.webhookSubscriptionDelete.userErrors, null, 2)}`)
  }

  return data?.webhookSubscriptionDelete
}

export const getShopifyConfig = async () => {
  const config = await loadNuxt({
    dotenv: true,
  })

  if (!config?.options?.runtimeConfig?._shopify) {
    throw new Error('[shopify] Failed to load the Shopify configuration: module is not configured')
  }

  return config.options.runtimeConfig._shopify
}

export const getSubscribedWebhooks = async (config: ShopifyConfig) => {
  const client = createAdminClient(config)

  return await fetchSubscriptions(client)
}

export const subscribeWebhook = async (config: ShopifyConfig) => {
  const client = createAdminClient(config)

  const subscriptions = await fetchSubscriptions(client)

  const results: WebhookSubscriptionResult[] = []

  for (const hook of config.webhooks?.hooks || []) {
    const existing = subscriptions.find(subscription => matches(subscription, hook))

    if (!existing) {
      const created = await createSubscription(client, hook)

      if (created) results.push({ action: 'created', subscription: created })

      continue
    }

    if (isUpToDate(existing, hook)) continue

    const updated = await updateSubscription(client, existing.id, hook)

    if (updated) results.push({ action: 'updated', subscription: updated })
  }

  return results
}

export const unsubscribeWebhook = async (config: ShopifyConfig) => {
  const client = createAdminClient(config)

  const subscriptions = await fetchSubscriptions(client)

  const results: WebhookSubscription[] = []

  for (const hook of config.webhooks?.hooks || []) {
    const subscription = subscriptions.find(subscription => matches(subscription, hook))

    if (!subscription) continue

    await deleteSubscription(client, subscription.id)

    results.push(subscription)
  }

  return results
}
