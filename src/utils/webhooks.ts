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
                        format
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
        throw new Error(`Failed to create webhook subscription: ${JSON.stringify(errors)}`)
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
                    format
                    filter
                    includeFields
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
        throw new Error(`Failed to create webhook subscription: ${JSON.stringify(errors)}`)
    }

    if (data?.webhookSubscriptionCreate.userErrors.length) {
        throw new Error(`Failed to create webhook subscription: ${JSON.stringify(data.webhookSubscriptionCreate.userErrors)}`)
    }

    return data?.webhookSubscriptionCreate
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

    const results = []

    for (const hook of config.webhooks?.hooks || []) {
        const result = await createSubscription(client, hook)

        results.push(result)
    }

    return results
}

export const unsubscribeWebhook = async (config: ShopifyConfig) => {
    console.log(config)
}
