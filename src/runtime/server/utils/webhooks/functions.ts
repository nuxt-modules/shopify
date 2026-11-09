import type { H3Event } from 'h3'

import { getRequestHeader } from 'h3'

/**
 * Gets the topic from the webhook request headers.
 *
 * @param event The H3Event object with the incoming request
 *
 * @returns The webhook topic
 */
export function getWebhookTopic(event: H3Event) {
  return getRequestHeader(event, 'x-shopify-topic')
}

/**
 * Gets the HMAC signature from the webhook request headers.
 *
 * @param event The H3Event object with the incoming request
 *
 * @returns The webhook HMAC
 */
export function getWebhookHmac(event: H3Event) {
  return getRequestHeader(event, 'x-shopify-hmac-sha256')
}

/**
 * Gets the shop domain from the webhook request headers.
 *
 * @param event The H3Event object with the incoming request
 *
 * @returns The shop domain
 */
export function getWebhookShopDomain(event: H3Event) {
  return getRequestHeader(event, 'x-shopify-shop-domain')
}

/**
 * Gets the API version from the webhook request headers.
 *
 * @param event The H3Event object with the incoming request
 *
 * @returns The API version
 */
export function getWebhookApiVersion(event: H3Event) {
  return getRequestHeader(event, 'x-shopify-api-version')
}

/**
 * Gets the webhook ID from the request headers.
 *
 * @param event The H3Event object with the incoming request
 *
 * @returns The webhook ID
 */
export function getWebhookId(event: H3Event) {
  return getRequestHeader(event, 'x-shopify-webhook-id')
}

/**
 * Gets the webhook triggered at timestamp from the request headers.
 *
 * @param event The H3Event object with the incoming request
 *
 * @returns The webhook triggered at timestamp
 */
export function getWebhookTriggeredAt(event: H3Event) {
  return getRequestHeader(event, 'x-shopify-triggered-at')
}

/**
 * Gets the webhook event ID from the request headers.
 *
 * @param event The H3Event object with the incoming request
 *
 * @returns The webhook event ID
 */
export function getWebhookEventId(event: H3Event) {
  return getRequestHeader(event, 'x-shopify-event-id')
}
