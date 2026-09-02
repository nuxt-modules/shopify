import { getCurrentApiVersion, getCurrentSupportedApiVersions } from '@shopify/graphql-client'

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

/**
 * Default value for the Shopify API version.
 */
export const DEFAULT_API_VERSION = getCurrentApiVersion().version

/**
 * Shape of a Shopify API version, either a quarterly release or `unstable`.
 */
export const API_VERSION_PATTERN = /^(?:unstable|2\d{3}-\d{2})$/

/**
 * Whether an API version is shaped like one Shopify publishes.
 */
export const isApiVersion = (version: string) => API_VERSION_PATTERN.test(version)

/**
 * Whether an API version falls inside the window Shopify supports.
 */
export const isSupportedApiVersion = (version: string) => getCurrentSupportedApiVersions().includes(version)
