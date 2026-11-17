import { beforeEach, describe, expect, it, vi } from 'vitest'

const { postRequest } = vi.hoisted(() => ({ postRequest: vi.fn() }))

vi.mock('nitropack/runtime', () => ({ defineNitroPlugin: (plugin: unknown) => plugin }))

vi.mock('#src/runtime/utils/devtools', () => ({ postRequest }))

const plugin = (await import('#src/runtime/server/plugins/devtools')).default as unknown as (nitroApp: unknown) => void

function start() {
  const hooks: Record<string, (params?: unknown) => void> = {}

  plugin({ hooks: { hook: (hookName: string, hook: (params?: unknown) => void) => void (hooks[hookName] = hook) } })

  return hooks
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('devtools plugin', () => {
  it.each([
    ['shopify:storefront:client:response', 'storefront'],
    ['shopify:customer-account:client:response', 'customer-account'],
    ['shopify:admin:client:response', 'admin'],
  ])('sends every `%s` of a server route to the DevTools panel, and listens to nothing else', (name, client) => {
    const hooks = start()

    const params = { operation: 'query Shop { shop { name } }', response: {}, duration: 1 }

    hooks[name]!(params)

    expect(postRequest).toHaveBeenLastCalledWith(client, 'server', params)
    expect(Object.keys(hooks).sort()).toStrictEqual(['shopify:admin:client:response', 'shopify:customer-account:client:response', 'shopify:storefront:client:response'])
  })
})
