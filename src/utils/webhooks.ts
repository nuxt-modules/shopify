import type { AdminApiClient } from '@nuxtjs/shopify/admin'

import type { ShopifyConfig } from '../types'

import { loadNuxt } from '@nuxt/kit'

import { createClient } from '../runtime/utils/client'
import { createAdminConfig } from '../runtime/utils/clients/admin'
import { flattenConnection } from '../runtime/utils/flattenConnection'

const createAdminClient = (config: ShopifyConfig): AdminApiClient => {
    const adminConfig = createAdminConfig(config)

    return createClient(adminConfig)
}

const fetchSubscriptions = async (client: AdminApiClient) => {
    const { data, errors } = await client.request(`#graphql
        query GetWebhookSubscriptions($first: Int!) {
            webhookSubscriptions(first: $first) {
                edges {
                    node {
                        id
                        topic
                        endpoint {
                            __typename
                            ... on WebhookHttpEndpoint {
                                callbackUrl
                            }
                        }
                    }
                }
            }
        }
    `, {
        variables: {
            first: 250,
        },
    })

    if (errors) {
        throw new Error(`Failed to fetch webhook subscriptions: ${JSON.stringify(errors)}`)
    }

    return flattenConnection(data?.webhookSubscriptions)
}

const createSubscription = async (client: AdminApiClient, hook: NonNullable<NonNullable<ShopifyConfig['webhooks']>['hooks']>[number]) => {
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
                    id
                    topic
                    endpoint {
                        __typename
                        ... on WebhookHttpEndpoint {
                            callbackUrl
                        }
                    }
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
            webhookSubscription: {
                callbackUrl: hook.uri,
                format: hook.format,
                filter: hook.filter,
                includeFields: hook.includeFields,
                metafields: hook.metafields,
                metafieldNamespaces: hook.metafieldNamespaces,
            },
        },
    })

    if (errors) {
        throw new Error(`Failed to create webhook subscription: ${JSON.stringify(errors), null, 2}`)
    }

    if (data?.webhookSubscriptionCreate.userErrors.length) {
        throw new Error(`Failed to create webhook subscription: ${JSON.stringify(data.webhookSubscriptionCreate.userErrors, null, 2)}`)
    }

    return data?.webhookSubscriptionCreate
}

const deleteSubscription = async (client: AdminApiClient, id: string) => {
    const { data, errors } = await client.request(`#graphql
        mutation webhookSubscriptionDelete($id: ID!) {
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
        throw new Error(`Failed to delete webhook subscription: ${JSON.stringify(errors), null, 2}`)
    }

    if (data?.webhookSubscriptionDelete.userErrors.length) {
        throw new Error(`Failed to delete webhook subscription: ${JSON.stringify(data.webhookSubscriptionDelete.userErrors, null, 2)}`)
    }

    return data?.webhookSubscriptionDelete
}

export const getShopifyConfig = async () => {
    const config = await loadNuxt({
        dotenv: true,
    })

    if (!config?.options?.runtimeConfig?._shopify) {
        throw new Error('Nuxt Shopify module ist not configured.')
    }

    return config.options.runtimeConfig._shopify
}

export const getSubscribedWebhooks = async (config: ShopifyConfig) => {
    const client = createAdminClient(config)

    const subscriptions = await fetchSubscriptions(client)

    return subscriptions
}

export const subscribeWebhook = async (config: ShopifyConfig) => {
    const client = createAdminClient(config)

    const subscriptions = await fetchSubscriptions(client)

    const results = []

    for (const hook of config.webhooks?.hooks || []) {
        if (subscriptions.some(subscription =>
            (subscription as { topic: string })?.topic === hook.topic
            && (subscription as { endpoint: { callbackUrl: string } })?.endpoint.callbackUrl === hook.uri,
        )) {
            continue
        }

        const result = await createSubscription(client, hook)

        results.push(result?.webhookSubscription)
    }

    return results
}

export const unsubscribeWebhook = async (config: ShopifyConfig) => {
    const client = createAdminClient(config)

    const subscriptions = await fetchSubscriptions(client)

    const results = []

    for (const hook of config.webhooks?.hooks || []) {
        const subscription = subscriptions.find(subscription =>
            (subscription as { topic: string })?.topic === hook.topic
            && (subscription as { endpoint: { callbackUrl: string } })?.endpoint.callbackUrl === hook.uri,
        )

        if (!subscription) {
            continue
        }

        const result = await deleteSubscription(client, (subscription as { id: string })?.id)

        results.push({
            id: result?.deletedWebhookSubscriptionId?.replace('gid://shopify/WebhookSubscription/', '') || '',
            topic: hook.topic,
            endpoint: { callbackUrl: hook.uri },
        })
    }

    return results
}
