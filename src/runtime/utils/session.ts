export const SESSION_PASSWORD_ENV = 'NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD'

export const SESSION_DEFAULT_NAME = '__Host-session'

export const CUSTOMER_ACCOUNT_SESSION_ROUTE = '/account/session'

export const SESSION_PASSWORD_MIN_LENGTH = 32

const EXAMPLE_SESSION_PASSWORD = 'A_RANDOM_32_CHARACTER_OR_LONGER_SECRET'

export function isUsableSessionPassword(password: string | undefined): password is string {
  return !!password && password.length >= SESSION_PASSWORD_MIN_LENGTH && password !== EXAMPLE_SESSION_PASSWORD
}
