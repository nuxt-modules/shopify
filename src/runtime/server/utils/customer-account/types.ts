import type { CustomerAccountUser } from '../../../../types'

export type { CustomerAccountTokenSet, CustomerAccountUser } from '../../../../types'

export type CustomerAccountSessionData = {
  user?: CustomerAccountUser
  loggedInAt?: number
}

export type CustomerAccountSession = {
  loggedIn: boolean
  user: CustomerAccountUser | null
  loggedInAt: number | null
}
