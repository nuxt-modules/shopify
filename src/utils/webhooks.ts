import type { AdminApiClient } from '@nuxtjs/shopify/admin'

import type { ShopifyConfig } from '../types'

import { loadNuxt } from '@nuxt/kit'

import { createAdminApiClient } from '../runtime/utils/clients/admin'
import { flattenConnection } from '@shopify/hydrogen'

const PAGE_SIZE = 250

type ConfiguredSubscription = NonNullable<NonNullable<ShopifyConfig['webhooks']>['subscriptions']>[number]

type MetafieldIdentifier = {
  key: string
  namespace?: string | null
}

export type WebhookSubscription = {
  id: string
  topic: string
  uri: string
  format: 'JSON' | 'XML'
  filter?: string | null
  includeFields: string[]
  metafieldNamespaces: string[]
  metafields: MetafieldIdentifier[]
}

type WebhookSubscriptionResult = {
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

const toInput = (configured: ConfiguredSubscription) => ({
  uri: configured.uri,
  format: configured.format,
  filter: configured.filter,
  includeFields: configured.includeFields,
  metafieldNamespaces: configured.metafieldNamespaces,
  metafields: configured.metafields,
})

function sameList(left: readonly string[] = [], right: readonly string[] = []) {
  if (left.length !== right.length) return false

  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()

  return sortedLeft.every((value, index) => value === sortedRight[index])
}

const metafieldKeys = (metafields: readonly MetafieldIdentifier[] = []) =>
  metafields.map(({ namespace, key }) => `${namespace ?? ''}/${key}`)

function isUpToDate(subscription: WebhookSubscription, configured: ConfiguredSubscription) {
  return subscription.format === configured.format
    && (subscription.filter ?? undefined) === configured.filter
    && sameList(subscription.includeFields, configured.includeFields)
    && sameList(subscription.metafieldNamespaces, configured.metafieldNamespaces)
    && sameList(metafieldKeys(subscription.metafields), metafieldKeys(configured.metafields))
}

const matches = (subscription: WebhookSubscription, configured: ConfiguredSubscription) =>
  subscription.topic === configured.topic && subscription.uri === configured.uri

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

const createSubscription = async (client: AdminApiClient, configured: ConfiguredSubscription) => {
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
      topic: configured.topic,
      webhookSubscription: toInput(configured),
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

const updateSubscription = async (client: AdminApiClient, id: string, configured: ConfiguredSubscription) => {
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
      webhookSubscription: toInput(configured),
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
  const nuxt = await loadNuxt({
    dotenv: true,
  })

  try {
    if (!nuxt.options.runtimeConfig._shopify) {
      throw new Error('[shopify] Failed to load the Shopify configuration: module is not configured')
    }

    return nuxt.options.runtimeConfig._shopify
  }
  finally {
    await nuxt.close()
  }
}

export const getSubscribedWebhooks = async (config: ShopifyConfig) => {
  const client = createAdminApiClient(config)

  return await fetchSubscriptions(client)
}

export const subscribeWebhooks = async (config: ShopifyConfig) => {
  const client = createAdminApiClient(config)

  const subscriptions = await fetchSubscriptions(client)

  const results: WebhookSubscriptionResult[] = []

  for (const configured of config.webhooks?.subscriptions || []) {
    const existing = subscriptions.find(subscription => matches(subscription, configured))

    if (!existing) {
      const created = await createSubscription(client, configured)

      if (created) results.push({ action: 'created', subscription: created })

      continue
    }

    if (isUpToDate(existing, configured)) continue

    const updated = await updateSubscription(client, existing.id, configured)

    if (updated) results.push({ action: 'updated', subscription: updated })
  }

  return results
}

export const unsubscribeWebhooks = async (config: ShopifyConfig) => {
  const client = createAdminApiClient(config)

  const subscriptions = await fetchSubscriptions(client)

  const results: WebhookSubscription[] = []

  for (const configured of config.webhooks?.subscriptions || []) {
    const subscription = subscriptions.find(subscription => matches(subscription, configured))

    if (!subscription) continue

    await deleteSubscription(client, subscription.id)

    results.push(subscription)
  }

  return results
}
