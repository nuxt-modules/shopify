/**
 * Augmentations for the customer account API with nuxt-auth-utils
 */
export const nuxtAuthUtilsTemplate = `
declare module '#auth-utils' {
  interface User {
    firstName: string | null
    lastName: string | null
    email: string
  }

  interface SecureSessionData {
    accessToken: string
    refreshToken: string
  }
}

export {}
`.trimStart()

/**
 * Augmentations for auto-imported functions from nuxt-auth-utils in development mode
 */
export const nuxtAuthUtilsDevTemplate = `
import type { defineEventHandler, H3Event } from 'h3'
import type { User, SecureSessionData } from '#auth-utils'

declare module '#imports' {
  const defineOAuthShopifyCustomerEventHandler: (options: {
    onSuccess: (event: H3Event, params: { user: { firstName: string, lastName: string, emailAddress: { emailAddress: string } }, tokens: { access_token: string, refresh_token?: string } }) => Promise<void>
    onError: (event: H3Event, error: Error) => Promise<void>
  }) => ReturnType<typeof defineEventHandler>

  const setUserSession: (event: H3Event, sessionData: { user: User, secure: SecureSessionData, loggedInAt: Date }) => Promise<void>
  const getUserSession: (event: H3Event) => Promise<{ user: User | null, secure: SecureSessionData | null, loggedInAt: Date | null } | null>
  const clearUserSession: (event: H3Event) => Promise<void>
}
`.trimStart()
