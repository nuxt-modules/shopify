export type CustomerAccountUser = {
  firstName: string | null
  lastName: string | null
  email: string
}

export type CustomerAccountTokenSet = {
  accessToken: string
  refreshToken?: string
  idToken?: string
  expiresAt: number
}

export type CustomerAccountTokens = {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_in?: number
  token_type?: string
}

export type CustomerAccountSessionData = {
  user?: CustomerAccountUser
  loggedInAt?: number
}

export type CustomerAccountSession = {
  loggedIn: boolean
  user: CustomerAccountUser | null
  loggedInAt: number | null
}

export type OpenIdConfiguration = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint: string
}

export type AdminTokenSet = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}
