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
 * Default value for whether to throw errors for API requests.
 */
export const DEFAULT_THROW_ERRORS = true
