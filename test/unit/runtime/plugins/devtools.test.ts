import { describe, expect, it, vi } from 'vitest'

const { postRequest } = vi.hoisted(() => ({ postRequest: vi.fn() }))

vi.mock('#imports', () => ({ defineNuxtPlugin: (plugin: unknown) => plugin }))

vi.mock('#src/runtime/utils/devtools', () => ({ postRequest }))

const plugin = (await import('#src/runtime/plugins/devtools')).default as unknown as { setup: (nuxtApp: unknown) => void }

describe('devtools plugin', () => {
  it.each([
    ['shopify:storefront:client:response', 'storefront'],
    ['shopify:customer-account:client:response', 'customer-account'],
  ])('sends every `%s` during server-side rendering to the DevTools panel, with the page it renders', (name, client) => {
    const hooks: Record<string, (params: unknown) => void> = {}

    plugin.setup({ ssrContext: { url: '/products/shirt' }, hook: (hookName: string, hook: (params: unknown) => void) => void (hooks[hookName] = hook) })

    const params = { operation: 'query Shop { shop { name } }', response: {}, duration: 1 }

    hooks[name]!(params)

    expect(postRequest).toHaveBeenLastCalledWith(client, 'ssr', params, '/products/shirt')
    expect(Object.keys(hooks)).toHaveLength(2)
  })
})
