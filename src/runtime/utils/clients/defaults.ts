import { CUSTOMER_ACCOUNT_API_VERSION } from '@shopify/hydrogen/customer-account'

export const DEFAULT_RETRIES = 0

export const MIN_RETRIES = 0

export const MAX_RETRIES = 3

export const DEFAULT_THROW_ERRORS = true

export const DEFAULT_API_VERSION = CUSTOMER_ACCOUNT_API_VERSION

const API_VERSION_PATTERN = /^(?:unstable|2\d{3}-\d{2})$/

export function isApiVersion(version: string) {
  return API_VERSION_PATTERN.test(version)
}
