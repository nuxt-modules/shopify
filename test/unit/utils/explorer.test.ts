import type { H3Event } from 'h3'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'
import { API_VERSION } from '#test/helpers/api-version'
import { createTestEvent } from '#test/helpers/event'
import { resolver } from '#test/helpers/nuxt'

const devServerHandlers: Array<{ route: string, handler: (event: H3Event) => unknown }> = []

const { addServerHandler } = vi.hoisted(() => ({ addServerHandler: vi.fn() }))

vi.mock('@nuxt/kit', () => ({
  addDevServerHandler: (handler: (typeof devServerHandlers)[number]) => devServerHandlers.push(handler),
  addServerHandler,
  extendRouteRules: vi.fn(),
}))

const { assertLocalRequest, registerExplorer, shouldEnableExplorer } = await import('#src/utils/explorer')

const config = {
  clients: {
    storefront: { apiVersion: API_VERSION, explorer: true },
    customerAccount: { apiVersion: API_VERSION, explorer: true, proxy: true },
    admin: { apiVersion: API_VERSION, explorer: true },
  },
}

const local = (path: string) => createTestEvent({ path, headers: { host: 'localhost:3005' }, remoteAddress: '127.0.0.1' })

function register() {
  const link = registerExplorer(resolver as never, config as never, ShopifyClientType.Admin)

  return {
    link,
    token: link.split('/').at(-1)!,
    page: devServerHandlers.find(handler => handler.route === link)!,
    proxyGuard: devServerHandlers.find(handler => handler.route === '/_explorer/proxy/admin')!,
  }
}

beforeEach(() => {
  devServerHandlers.length = 0
  addServerHandler.mockClear()
})

describe('explorer page', () => {
  it('serves the admin explorer only at the link it logs, which carries a token, and points it at the proxy with the same token', async () => {
    const { link, page, token } = register()

    expect(link).toMatch(/^\/_explorer\/admin\/[\da-f-]{36}$/)
    expect(devServerHandlers.map(handler => handler.route)).not.toContain('/_explorer/admin')

    await expect(page.handler(local(link))).resolves.toContain(`/_explorer/proxy/admin/${token}`)
  })

  it('draws a new token for every dev server', () => {
    expect(register().token).not.toBe(register().token)
  })

  it('refuses to serve the explorer through a tunnel', async () => {
    const { link, page } = register()

    await expect(page.handler(createTestEvent({ path: link, headers: { host: 'abc123.ngrok.app' }, remoteAddress: '127.0.0.1' })))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('explorer proxy guard', () => {
  it('lets requests from this machine on to the proxy', () => {
    const { proxyGuard, token } = register()

    expect(proxyGuard.handler(createTestEvent({ method: 'POST', path: `/_explorer/proxy/admin/${token}`, headers: { host: 'localhost:3005' }, remoteAddress: '::1' })))
      .toBeUndefined()
  })

  it.each([
    ['a tunnel', 'abc123.ngrok.app', '127.0.0.1'],
    ['another machine', 'localhost:3005', '192.168.1.20'],
  ])('stops requests through %s before they reach the proxy', (_, host, remoteAddress) => {
    const { proxyGuard, token } = register()

    expect(() => proxyGuard.handler(createTestEvent({ method: 'POST', path: `/_explorer/proxy/admin/${token}`, headers: { host }, remoteAddress })))
      .toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})

describe('explorer endpoints', () => {
  it.each([
    [ShopifyClientType.Storefront, `/api/${API_VERSION}/graphql.json`],
    [ShopifyClientType.CustomerAccount, `/account/customer/api/${API_VERSION}/graphql`],
  ])('sends the %s explorer through the same proxy as the browser client, with no proxy or token of its own', async (clientType, endpoint) => {
    const link = registerExplorer(resolver as never, config as never, clientType)

    const page = devServerHandlers.find(handler => handler.route.startsWith('/_explorer/'))!

    expect(link).toBe(`/_explorer/${clientType === ShopifyClientType.Storefront ? 'storefront' : 'customer-account'}`)
    expect(page.route).toBe(link)
    expect(devServerHandlers).toHaveLength(1)
    expect(addServerHandler).not.toHaveBeenCalled()
    await expect(page.handler(local(page.route))).resolves.toContain(endpoint)
  })

  it('keeps the admin proxy in Nitro, where it shares the admin token storage of `useAdmin`, at a path only the token opens', () => {
    const { token } = register()

    expect(addServerHandler).toHaveBeenCalledExactlyOnceWith({
      route: `/_explorer/proxy/admin/${token}`,
      method: 'post',
      handler: './runtime/server/api/admin/explorer',
    })
  })

  it('offers no customer account explorer without the customer account proxy', () => {
    const nuxt = { options: { dev: true } }

    expect(shouldEnableExplorer(nuxt as never, config as never, ShopifyClientType.CustomerAccount)).toBe(true)
    expect(shouldEnableExplorer(nuxt as never, { clients: { customerAccount: { explorer: true, proxy: false } } } as never, ShopifyClientType.CustomerAccount)).toBe(false)
    expect(shouldEnableExplorer({ options: { dev: false } } as never, config as never, ShopifyClientType.Storefront)).toBe(false)
  })
})

describe('assertLocalRequest', () => {
  const request = (host: string, remoteAddress: string) => createTestEvent({ method: 'POST', headers: { host }, remoteAddress })

  it.each([
    ['localhost:3005', '127.0.0.1'],
    ['127.0.0.1:3005', '127.0.0.1'],
    ['[::1]:3005', '::1'],
    ['localhost:3005', '::ffff:127.0.0.1'],
    ['local.tryhydrogen.dev:5173', '127.0.0.1'],
  ])('allows a request to %s from %s', (host, remoteAddress) => {
    expect(() => assertLocalRequest(request(host, remoteAddress))).not.toThrow()
  })

  it.each([
    ['abc123.ngrok.app', '127.0.0.1'],
    ['shop.example.com', '127.0.0.1'],
    ['192.168.1.20:3005', '192.168.1.20'],
    ['localhost:3005', '192.168.1.20'],
  ])('rejects a request to %s from %s', (host, remoteAddress) => {
    expect(() => assertLocalRequest(request(host, remoteAddress))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})
