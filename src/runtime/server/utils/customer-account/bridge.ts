type BridgePayload = {
  accessToken: string
  refreshToken: string
  user: {
    firstName: string | null
    lastName: string | null
    email: string
  }
  expiresAt: number
}

const bridgeStore = new Map<string, BridgePayload>()
const TTL_MS = 60_000

export function createBridgeNonce(payload: Omit<BridgePayload, 'expiresAt'>) {
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
