// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

const { postRequest, toDevtoolsRequest } = vi.hoisted(() => ({ postRequest: vi.fn(), toDevtoolsRequest: vi.fn() }))

vi.mock('#imports', () => ({ defineNuxtPlugin: (plugin: unknown) => plugin }))

vi.mock('#src/runtime/utils/devtools', () => ({ DEVTOOLS_EVENT: 'shopify:devtools:request', postRequest, toDevtoolsRequest }))

const plugin = (await import('#src/runtime/plugins/devtools.client')).default as unknown as { setup: (nuxtApp: unknown) => void }

describe('devtools client plugin', () => {
  it.each([
    ['shopify:storefront:client:response', 'storefront'],
    ['shopify:customer-account:client:response', 'customer-account'],
  ])('sends every `%s` in the browser to the DevTools panel over the dev server, with the page it was sent from', (name, client) => {
    const hooks: Record<string, (params: unknown) => void> = {}
    const hot = { send: vi.fn() }
    const request = { client, source: 'browser' }

    vi.stubGlobal('__NUXT_HOT__', hot)
    toDevtoolsRequest.mockReturnValue(request)

    plugin.setup({ hook: (hookName: string, hook: (params: unknown) => void) => void (hooks[hookName] = hook) })

    window.history.pushState({}, '', '/products/shirt?variant=1')

    const params = { operation: 'query Shop { shop { name } }', response: {}, duration: 1 }

    hooks[name]!(params)

    expect(toDevtoolsRequest).toHaveBeenLastCalledWith(client, 'browser', params, '/products/shirt?variant=1')
    expect(hot.send).toHaveBeenCalledExactlyOnceWith('shopify:devtools:request', request)
    expect(postRequest).not.toHaveBeenCalled()
    expect(Object.keys(hooks)).toHaveLength(2)
  })
})
