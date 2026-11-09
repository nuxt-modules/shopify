import type { H3Event } from 'h3'

export type ShopifyCustomerAccountSession = {
  isLoggedIn: boolean
}

export type ShopifyCustomerAccountContext = {
  getSession: (event: H3Event) => Promise<ShopifyCustomerAccountSession>
  getAccessToken: (event: H3Event) => Promise<string>
}

export type ShopifyAdminTokenSet = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}
