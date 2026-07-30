import { getCurrentApiVersion } from '@shopify/graphql-client'

/**
 * Default value for the Shopify API version.
 */
export const DEFAULT_API_VERSION = getCurrentApiVersion().version

/**
 * Default value for the number of retries for API requests.
 */
export const DEFAULT_RETRIES = 0

/**
 * Lowest number of retries accepted by the Shopify GraphQL client.
 */
export const MIN_RETRIES = 0

/**
 * Highest number of retries accepted by the Shopify GraphQL client.
 */
export const MAX_RETRIES = 3

/**
 * Default value for whether to throw errors for API requests.
 */
export const DEFAULT_THROW_ERRORS = true
