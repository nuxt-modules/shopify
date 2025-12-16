import type { H3Event } from 'h3'

import { getHeaders } from 'h3'

export const getWebhookTopic = (event: H3Event) => getHeaders(event)['x-shopify-topic']

export const getWebhookHmac = (event: H3Event) => getHeaders(event)['x-shopify-hmac-sha256']

export const getWebhookShopDomain = (event: H3Event) => getHeaders(event)['x-shopify-shop-domain']

export const getWebhookApiVersion = (event: H3Event) => getHeaders(event)['x-shopify-api-version']

export const getWebhookId = (event: H3Event) => getHeaders(event)['x-shopify-webhook-id']

export const getWebhookTriggeredAt = (event: H3Event) => getHeaders(event)['x-shopify-triggered-at']

export const getWebhookEventId = (event: H3Event) => getHeaders(event)['x-shopify-event-id']
