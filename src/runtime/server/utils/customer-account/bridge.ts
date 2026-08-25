import type { CustomerAccountTokenSet, CustomerAccountUser } from './session'

type BridgePayload = {
  user: CustomerAccountUser
  tokens: CustomerAccountTokenSet
  returnTo?: string
  expiresAt: number
}

const bridgeStore = new Map<string, BridgePayload>()
const TTL_MS = 60_000

function sweepExpired() {
  const now = Date.now()

  for (const [nonce, item] of bridgeStore) {
    if (item.expiresAt < now) bridgeStore.delete(nonce)
  }
}

export function createBridgeNonce(payload: Omit<BridgePayload, 'expiresAt'>) {
  sweepExpired()

  const nonce = crypto.randomUUID()

  bridgeStore.set(nonce, { ...payload, expiresAt: Date.now() + TTL_MS })

  return nonce
}

export function consumeBridgeNonce(nonce: string) {
  const item = bridgeStore.get(nonce)

  if (!item) return null

  bridgeStore.delete(nonce)

  if (item.expiresAt < Date.now()) return null

  return item
}
