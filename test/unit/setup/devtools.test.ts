import type { Resolver } from '@nuxt/kit'

import type { ShopifyDevtoolsRequest } from '#src/runtime/utils/devtools'

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVTOOLS_CHANNEL, DEVTOOLS_EVENT } from '#src/runtime/utils/devtools'
import { ShopifyClientType } from '#src/schemas'
import { API_VERSION } from '#test/helpers/api-version'
import { createLoggerStub } from '#test/helpers/logger'
import { resolver } from '#test/helpers/nuxt'

type Element = { type: string, props: Record<string, unknown>, children?: string[], on?: Record<string, unknown> }

type Spec = { elements: Record<string, Element> }

type Action = { name: string, type: string, handler: (params?: Record<string, unknown>) => unknown }

const { addNitroPlugin, addPlugin, hasNuxtModuleCompatibility, onDevtoolsReady, getDocumentFiles, getGenerateFailures, registerExplorer, shouldEnableExplorer } = vi.hoisted(() => ({
  addNitroPlugin: vi.fn(),
  addPlugin: vi.fn(),
  hasNuxtModuleCompatibility: vi.fn(async () => true),
  onDevtoolsReady: vi.fn(),
  getDocumentFiles: vi.fn<() => Map<string, Set<string>>>(),
  getGenerateFailures: vi.fn<() => string[]>(),
  registerExplorer: vi.fn<(resolver: unknown, config: unknown, clientType: string) => string | undefined>(),
  shouldEnableExplorer: vi.fn<(nuxt: unknown, config: unknown, clientType: string) => boolean>(),
}))

const logger = createLoggerStub()

vi.mock('@nuxt/kit', () => ({ addNitroPlugin, addPlugin, hasNuxtModuleCompatibility }))

vi.mock('@nuxt/devtools-kit', () => ({ NUXT_DEVTOOLS_GROUP_ID: 'nuxt', onDevtoolsReady }))

vi.mock('#src/utils/codegen', () => ({ getDocumentFiles, getGenerateFailures }))

vi.mock('#src/utils/explorer', () => ({ registerExplorer, shouldEnableExplorer }))

vi.mock('#src/utils/log', () => ({ useLogger: () => logger }))

const setupDevtools = (await import('#src/setup/devtools')).default as unknown as (nuxt: ReturnType<typeof createNuxt>, config: object, resolver: Resolver) => void

const config = {
  name: 'shop',
  clients: {
    storefront: { apiVersion: API_VERSION, publicAccessToken: 'public-token', privateAccessToken: 'private-token', headers: { 'X-Secret': 'header-secret' }, cache: { server: { driver: 'redis', url: 'redis://user:storage-secret@host' } } },
    customerAccount: { apiVersion: API_VERSION, clientId: 'client-id', session: { password: 'session-secret' }, tokenStorage: { driver: 'redis', password: 'token-storage-secret' } },
    admin: { apiVersion: API_VERSION, accessToken: 'admin-token', clientSecret: 'client-secret', refreshToken: 'refresh-token' },
  },
  webhooks: { secret: 'webhook-secret' },
  devtools: true,
}

const QUERY = 'query FetchShop { shop { name } }'

const PRINTED_QUERY = 'query FetchShop {\n  shop {\n    name\n  }\n}'

const channels: BroadcastChannel[] = []

const started: Array<ReturnType<typeof createNuxt>> = []

let dir: string

function createNuxt(dev = true) {
  const hooks: Record<string, Array<(...args: unknown[]) => unknown>> = {}

  return {
    options: { dev, rootDir: dir },
    hooks,
    hook: (name: string, hook: (...args: unknown[]) => unknown) => void (hooks[name] ??= []).push(hook),
    callHook: (name: string, ...args: unknown[]) => Promise.all((hooks[name] ?? []).map(hook => hook(...args))),
  }
}

function serveExplorers(explorers: Map<ShopifyClientType, string>) {
  shouldEnableExplorer.mockImplementation((_nuxt, _config, clientType) => explorers.has(clientType as ShopifyClientType))
  registerExplorer.mockImplementation((_resolver, _config, clientType) => explorers.get(clientType as ShopifyClientType))
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)

    for (const child of Object.values(value)) freeze(child)
  }

  return value
}

function createDevtools() {
  const panel = { view: { stateKey: 'shopify-panel' }, updateSpec: vi.fn<(spec: Spec) => void>(spec => void freeze(spec)) }
  const rpc = { register: vi.fn<(definition: Action) => void>() }
  const dock = { update: vi.fn() }

  return {
    panel,
    rpc,
    dock,
    context: {
      createJsonRenderer: vi.fn<(spec: Spec) => typeof panel>((spec) => {
        freeze(spec)

        return panel
      }),
      docks: { register: vi.fn(() => dock), activate: vi.fn() },
      messages: { add: vi.fn(async () => ({})), update: vi.fn(async () => undefined) },
      scope: vi.fn(() => ({ rpc })),
      viteServer: { ws: { on: vi.fn<(event: string, listener: (data: unknown) => void) => void>() } },
    },
  }
}

async function start(explorers = new Map<ShopifyClientType, string>(), shopifyConfig: object = config) {
  const nuxt = createNuxt()
  const devtools = createDevtools()

  started.push(nuxt)
  serveExplorers(explorers)

  setupDevtools(nuxt, shopifyConfig, resolver)

  await nuxt.callHook('modules:done')

  onDevtoolsReady.mock.lastCall![0](devtools.context)

  const action = (name: string) => devtools.rpc.register.mock.calls.find(([definition]) => definition.name === name)![0]
  const spec = () => devtools.panel.updateSpec.mock.lastCall?.[0] ?? devtools.context.createJsonRenderer.mock.lastCall![0]

  return { nuxt, action, spec, ...devtools }
}

function sendRequests(requests: Partial<ShopifyDevtoolsRequest>[]) {
  const channel = new BroadcastChannel(DEVTOOLS_CHANNEL)

  channels.push(channel)

  for (const request of requests) {
    channel.postMessage({ client: 'storefront', source: 'ssr', operation: 'FetchShop', query: QUERY, duration: 120.4, time: 0, ...request })
  }
}

async function receive(spec: () => Spec, count: number) {
  await vi.waitFor(() => expect(spec().elements['requests-table']!.props.rows).toHaveLength(count))

  return spec().elements
}

function writeDocument(path: string, contents: string) {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), contents)

  return join(dir, path)
}

beforeEach(() => {
  vi.clearAllMocks()

  dir = mkdtempSync(join(tmpdir(), 'nuxt-shopify-devtools-'))

  getDocumentFiles.mockReturnValue(new Map())
  getGenerateFailures.mockReturnValue([])
})

afterEach(async () => {
  for (const channel of channels.splice(0)) channel.close()

  await Promise.all(started.splice(0).map(nuxt => nuxt.callHook('close')))

  rmSync(dir, { recursive: true, force: true })
})

describe('setupDevtools', () => {
  it('adds nothing outside development', () => {
    const nuxt = createNuxt(false)

    serveExplorers(new Map([[ShopifyClientType.Storefront, '/_explorer/storefront']]))

    setupDevtools(nuxt, config, resolver)

    expect(nuxt.hooks).toStrictEqual({})
    expect(registerExplorer).not.toHaveBeenCalled()
  })

  it('serves the explorer of every client that enables it, and logs its link', async () => {
    const { nuxt } = await start(new Map([
      [ShopifyClientType.Storefront, '/_explorer/storefront'],
      [ShopifyClientType.Admin, '/_explorer/admin/token'],
    ]))

    expect(shouldEnableExplorer.mock.calls.map(([, , clientType]) => clientType)).toStrictEqual([ShopifyClientType.Storefront, ShopifyClientType.CustomerAccount, ShopifyClientType.Admin])
    expect(registerExplorer.mock.calls).toStrictEqual([[resolver, config, ShopifyClientType.Storefront], [resolver, config, ShopifyClientType.Admin]])

    await nuxt.callHook('listen', {}, { url: 'http://localhost:3005/' })

    expect(logger.info).toHaveBeenCalledTimes(2)
    expect(logger.info).toHaveBeenNthCalledWith(1, 'The storefront explorer is available at http://localhost:3005/_explorer/storefront')
    expect(logger.info).toHaveBeenNthCalledWith(2, 'The admin explorer is available at http://localhost:3005/_explorer/admin/token')
  })

  it('serves only the explorers with DevTools 3, which Nuxt 4 installs by default', async () => {
    hasNuxtModuleCompatibility.mockResolvedValueOnce(false)

    const nuxt = createNuxt()

    serveExplorers(new Map([[ShopifyClientType.Storefront, '/_explorer/storefront']]))

    setupDevtools(nuxt, config, resolver)

    await nuxt.callHook('modules:done')

    expect(registerExplorer).toHaveBeenCalledExactlyOnceWith(resolver, config, ShopifyClientType.Storefront)
    expect(addNitroPlugin).not.toHaveBeenCalled()
    expect(addPlugin).not.toHaveBeenCalled()
    expect(onDevtoolsReady).not.toHaveBeenCalled()
  })

  it('serves the explorers but adds nothing to DevTools with `devtools: false`', async () => {
    const nuxt = createNuxt()
    const withoutDevtools = { ...config, devtools: false }

    started.push(nuxt)
    serveExplorers(new Map([[ShopifyClientType.Storefront, '/_explorer/storefront']]))

    setupDevtools(nuxt, withoutDevtools, resolver)

    await nuxt.callHook('modules:done')
    await nuxt.callHook('listen', {}, { url: 'http://localhost:3005/' })

    expect(registerExplorer).toHaveBeenCalledExactlyOnceWith(resolver, withoutDevtools, ShopifyClientType.Storefront)
    expect(logger.info).toHaveBeenCalledExactlyOnceWith('The storefront explorer is available at http://localhost:3005/_explorer/storefront')
    expect(hasNuxtModuleCompatibility).not.toHaveBeenCalled()
    expect(addNitroPlugin).not.toHaveBeenCalled()
    expect(addPlugin).not.toHaveBeenCalled()
    expect(onDevtoolsReady).not.toHaveBeenCalled()
  })

  it('checks for DevTools 4 once every module is installed, because Nuxt installs DevTools after the app\'s modules', async () => {
    const nuxt = createNuxt()

    setupDevtools(nuxt, config, resolver)

    expect(hasNuxtModuleCompatibility).not.toHaveBeenCalled()

    await nuxt.callHook('modules:done')

    expect(hasNuxtModuleCompatibility).toHaveBeenCalledExactlyOnceWith('@nuxt/devtools', '>=4.0.0', nuxt)
  })

  it('logs the requests of server-side rendering, server routes and the browser with DevTools 4', async () => {
    await start()

    expect(addNitroPlugin).toHaveBeenCalledExactlyOnceWith('./runtime/server/plugins/devtools')
    expect(addPlugin.mock.calls).toStrictEqual([
      [{ src: './runtime/plugins/devtools', mode: 'server' }],
      [{ src: './runtime/plugins/devtools.client', mode: 'client' }],
    ])
  })

  it('adds the Shopify panel and a tab for every explorer to the Nuxt group', async () => {
    const { context, panel } = await start(new Map([
      [ShopifyClientType.Storefront, '/_explorer/storefront'],
      [ShopifyClientType.CustomerAccount, '/_explorer/customer-account'],
    ]))

    expect(context.docks.register.mock.calls).toStrictEqual([
      [{ id: 'shopify', title: 'Shopify', icon: 'simple-icons:shopify', type: 'json-render', view: panel.view, groupId: 'nuxt', category: 'modules' }],
      [{ id: 'shopify:storefront-explorer', title: 'Storefront API', icon: 'simple-icons:graphql', type: 'iframe', url: '/_explorer/storefront', groupId: 'nuxt', category: 'modules' }],
      [{ id: 'shopify:customer-account-explorer', title: 'Customer Account API', icon: 'simple-icons:graphql', type: 'iframe', url: '/_explorer/customer-account', groupId: 'nuxt', category: 'modules' }],
    ])
  })

  it('stops listening when Nuxt closes, so `nuxt dev` can exit', async () => {
    const close = vi.spyOn(BroadcastChannel.prototype, 'close')

    const { nuxt } = await start()

    expect(close).not.toHaveBeenCalled()

    await nuxt.callHook('close')

    expect(close).toHaveBeenCalledOnce()

    close.mockRestore()
  })
})

describe('requests tab', () => {
  it('lists every request with its time, API, operation, source, page, status and duration', async () => {
    const { spec } = await start()

    const time = Date.UTC(2026, 10, 16, 12, 30)

    sendRequests([
      { time, page: '/products/shirt' },
      { client: 'admin', source: 'server', operation: 'FetchOrders', errors: { message: 'Access denied' }, duration: 80, time },
    ])

    const elements = await receive(spec, 2)

    expect(elements['requests-table']!.props.rows).toStrictEqual([
      { id: 2, time: new Date(time).toLocaleTimeString(), api: 'Admin', operation: 'FetchOrders', source: 'Server route', page: undefined, status: 'Error', duration: '80 ms' },
      { id: 1, time: new Date(time).toLocaleTimeString(), api: 'Storefront', operation: 'FetchShop', source: 'SSR', page: '/products/shirt', status: 'OK', duration: '120 ms' },
    ])
  })

  it('leaves the duration empty for a request without one', async () => {
    const { action, spec } = await start()

    sendRequests([{ duration: undefined }])

    const elements = await receive(spec, 1)

    expect(elements['requests-table']!.props.rows).toMatchObject([{ operation: 'FetchShop', duration: undefined }])

    action('select-request').handler({ id: 1 })

    expect(spec().elements['request-summary']!.props.data).not.toHaveProperty('Duration')
  })

  it('lists the requests the browser sends over the connection of the dev server', async () => {
    const { context, spec } = await start()

    expect(context.viteServer.ws.on).toHaveBeenCalledExactlyOnceWith(DEVTOOLS_EVENT, expect.any(Function))
    expect(spec().elements['requests-hint']!.props.text).toBe('Shopify requests from server-side rendering, server routes and the browser. Click one to see its details.')

    sendRequests([{}])

    await receive(spec, 1)

    context.viteServer.ws.on.mock.lastCall![1]({ client: 'customer-account', source: 'browser', page: '/account/orders?page=2', operation: 'FetchOrders', query: QUERY, duration: 80, time: 0 })

    expect(spec().elements['requests-table']!.props.rows).toStrictEqual([
      { id: 2, time: new Date(0).toLocaleTimeString(), api: 'Customer Account', operation: 'FetchOrders', source: 'Browser', page: '/account/orders?page=2', status: 'OK', duration: '80 ms' },
      { id: 1, time: new Date(0).toLocaleTimeString(), api: 'Storefront', operation: 'FetchShop', source: 'SSR', page: undefined, status: 'OK', duration: '120 ms' },
    ])
  })

  it('shows the newest request first and keeps the last 100', async () => {
    const { spec } = await start()

    sendRequests(Array.from({ length: 101 }, (_, index) => ({ operation: `Operation${index}` })))

    const elements = await receive(spec, 100)
    const rows = elements['requests-table']!.props.rows as Array<{ operation: string }>

    expect(rows[0]).toMatchObject({ operation: 'Operation100' })
    expect(rows.at(-1)).toMatchObject({ operation: 'Operation1' })
    expect(elements.tabs!.props.tabs).toMatchObject([{ value: 'requests', badge: '100', badgeVariant: undefined }, { value: 'operations' }, { value: 'config' }])
  })

  it('shows the details of the request you click below the list, which scrolls on its own', async () => {
    const { action, spec } = await start()

    sendRequests([
      { page: '/products/shirt', variables: { handle: 'shirt' }, data: { shop: { name: 'Shop' } }, extensions: { cost: { actualQueryCost: 1 } } },
      { operation: 'FetchMenu' },
    ])

    const table = (await receive(spec, 2))['requests-table']!

    expect(spec().elements.requests!.children).toStrictEqual(['requests-toolbar', 'requests-table'])
    expect(table.props.height).toBe(320)
    expect(table.props.value).toStrictEqual({ $bindState: '/request' })
    expect(table.on).toStrictEqual({ rowClick: { action: 'shopify:select-request', params: { id: { $state: '/request/row/id' } } } })
    expect(action('select-request').type).toBe('action')

    action('select-request').handler({ id: 1 })

    const { elements } = spec()

    expect(elements.requests!.children).toStrictEqual(['requests-toolbar', 'requests-table', 'request-details'])
    expect(elements['request-details']).toStrictEqual({ type: 'Card', props: { title: 'FetchShop · Storefront API' }, children: ['request-summary', 'request-tabs'] })
    expect(elements['request-summary']!.props.data).toStrictEqual({ Time: new Date(0).toLocaleTimeString(), API: 'Storefront', Operation: 'FetchShop', Source: 'SSR', Page: '/products/shirt', Status: 'OK', Duration: '120 ms' })
    expect(elements['request-tabs']).toStrictEqual({
      type: 'Tabs',
      props: { tabs: [{ value: 'query', label: 'Query' }, { value: 'variables', label: 'Variables' }, { value: 'response', label: 'Response' }, { value: 'extensions', label: 'Extensions' }] },
      children: ['request-query', 'request-variables', 'request-response', 'request-extensions'],
    })
    expect(elements['request-query']).toStrictEqual({ type: 'CodeBlock', props: { code: PRINTED_QUERY, language: 'graphql', height: 320 } })
    expect(elements['request-variables']).toStrictEqual({ type: 'CodeBlock', props: { code: JSON.stringify({ handle: 'shirt' }, null, 2), language: 'json', height: 320 } })
    expect(elements['request-response']).toStrictEqual({ type: 'Tree', props: { data: { shop: { name: 'Shop' } } } })
    expect(elements['request-extensions']).toStrictEqual({ type: 'Tree', props: { data: { cost: { actualQueryCost: 1 } }, defaultExpanded: true } })
  })

  it('shows the errors of a failed request instead of its response', async () => {
    const { action, spec } = await start()

    const errors = { message: 'GraphQL Client: An error occurred', networkStatusCode: 401 }

    sendRequests([{ client: 'admin', source: 'server', errors }])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    const { elements } = spec()

    expect(elements['request-summary']!.props.data).toMatchObject({ Source: 'Server route', Status: 'Error' })
    expect(elements['request-summary']!.props.data).not.toHaveProperty('Page')
    expect(elements['request-tabs']!.children).toStrictEqual(['request-query', 'request-errors'])
    expect(elements['request-errors']).toStrictEqual({ type: 'Tree', props: { data: errors, defaultExpanded: true } })
  })

  it('keeps showing the request you clicked while newer ones arrive', async () => {
    const { action, spec } = await start()

    sendRequests([{}])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    sendRequests([{ operation: 'FetchMenu' }])

    const elements = await receive(spec, 2)

    expect(elements['request-details']!.props.title).toBe('FetchShop · Storefront API')
  })

  it.each([
    [ShopifyClientType.Storefront, 'storefront', '/_explorer/storefront'],
    [ShopifyClientType.CustomerAccount, 'customer-account', '/_explorer/customer-account'],
    [ShopifyClientType.Admin, 'admin', '/_explorer/admin/token'],
  ] as const)('links a %s request to its explorer, with its query and variables', async (clientType, client, route) => {
    const { action, spec } = await start(new Map([[clientType, route]]))

    sendRequests([{ client, variables: { handle: 'shirt' } }])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    const { elements } = spec()
    const link = elements['request-explorer']!
    const url = new URL(link.props.href as string, 'http://localhost')

    expect(elements['request-details']!.children).toStrictEqual(['request-summary', 'request-explorer', 'request-tabs'])
    expect(link).toMatchObject({ type: 'Link', props: { label: 'Open in explorer', icon: 'ph:arrow-square-out', external: true } })
    expect(url.pathname).toBe(route)
    expect(url.searchParams.get('query')).toBe(PRINTED_QUERY)
    expect(url.searchParams.get('variables')).toBe(JSON.stringify({ handle: 'shirt' }, null, 2))
  })

  it.each([
    [
      'minified, as Hydrogen sends it',
      'mutation CartNoteUpdate($cartId:ID!$note:String!){cartNoteUpdate(cartId:$cartId note:$note){cart{id note}userErrors{field message}}}',
      'mutation CartNoteUpdate($cartId: ID!, $note: String!) {\n  cartNoteUpdate(cartId: $cartId, note: $note) {\n    cart {\n      id\n      note\n    }\n    userErrors {\n      field\n      message\n    }\n  }\n}',
    ],
    [
      'with the #graphql marker and the indentation of its file',
      '#graphql\n    query FetchProducts($first: Int) {\n      products(first: $first) {\n        nodes {\n          id\n        }\n      }\n    }\n  ',
      'query FetchProducts($first: Int) {\n  products(first: $first) {\n    nodes {\n      id\n    }\n  }\n}',
    ],
  ])('formats a query %s, in the details and in the explorer link', async (_case, query, printed) => {
    const { action, spec } = await start(new Map([[ShopifyClientType.Storefront, '/_explorer/storefront']]))

    sendRequests([{ query }])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    const { elements } = spec()

    expect(elements['request-query']!.props.code).toBe(printed)
    expect(new URL(elements['request-explorer']!.props.href as string, 'http://localhost').searchParams.get('query')).toBe(printed)
  })

  it('shows a query it can\'t parse as it was sent', async () => {
    const { action, spec } = await start(new Map([[ShopifyClientType.Storefront, '/_explorer/storefront']]))

    sendRequests([{ query: '  query Broken { shop { name\n' }])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    const { elements } = spec()

    expect(elements['request-query']!.props.code).toBe('query Broken { shop { name')
    expect(new URL(elements['request-explorer']!.props.href as string, 'http://localhost').searchParams.get('query')).toBe('query Broken { shop { name')
  })

  it('links a request without variables to its explorer with its query only', async () => {
    const { action, spec } = await start(new Map([[ShopifyClientType.Storefront, '/_explorer/storefront']]))

    sendRequests([{}])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    const url = new URL(spec().elements['request-explorer']!.props.href as string, 'http://localhost')

    expect([...url.searchParams.keys()]).toStrictEqual(['query'])
  })

  it('leaves the explorer link out when the API of the request has no explorer', async () => {
    const { action, spec } = await start(new Map([[ShopifyClientType.Storefront, '/_explorer/storefront']]))

    sendRequests([{ client: 'admin' }])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    const { elements } = spec()

    expect(elements['request-explorer']).toBeUndefined()
    expect(elements['request-details']!.children).toStrictEqual(['request-summary', 'request-tabs'])
  })

  it('switches DevTools to the tab of each explorer with its button', async () => {
    const { action, context, spec } = await start(new Map([
      [ShopifyClientType.Storefront, '/_explorer/storefront'],
      [ShopifyClientType.Admin, '/_explorer/admin/token'],
    ]))

    const { elements } = spec()

    expect(elements['requests-actions']!.children).toStrictEqual(['requests-explorer-storefront', 'requests-explorer-admin', 'requests-clear'])
    expect(elements['requests-explorer-admin']).toStrictEqual({
      type: 'Button',
      props: { label: 'Admin API', icon: 'simple-icons:graphql', variant: 'ghost' },
      on: { press: { action: 'shopify:open-explorer', params: { id: 'shopify:admin-explorer' } } },
    })
    expect(action('open-explorer').type).toBe('action')

    action('open-explorer').handler({ id: 'shopify:admin-explorer' })

    expect(context.docks.activate).toHaveBeenCalledExactlyOnceWith('shopify:admin-explorer')
  })

  it('marks failed requests in red on the Requests tab and on the Shopify entry', async () => {
    const { action, dock, spec } = await start()

    sendRequests([{}, { errors: { message: 'Access denied' } }])

    const elements = await receive(spec, 2)

    expect((elements.tabs!.props.tabs as unknown[])[0]).toStrictEqual({ value: 'requests', label: 'Requests', badge: '1', badgeVariant: 'danger' })
    expect(dock.update).toHaveBeenLastCalledWith({ badge: '1', badgeVariant: 'danger' })

    action('clear-requests').handler()

    expect((spec().elements.tabs!.props.tabs as unknown[])[0]).toStrictEqual({ value: 'requests', label: 'Requests', badge: undefined, badgeVariant: undefined })
    expect(dock.update).toHaveBeenLastCalledWith({ badge: undefined, badgeVariant: 'danger' })
  })

  it('clears the requests and the details with the panel\'s button', async () => {
    const { action, spec } = await start()

    sendRequests([{}])

    await receive(spec, 1)

    action('select-request').handler({ id: 1 })

    expect(spec().elements['requests-clear']!.on).toStrictEqual({ press: { action: 'shopify:clear-requests' } })
    expect(action('clear-requests').type).toBe('action')

    action('clear-requests').handler()

    const { elements } = spec()

    expect(elements['requests-table']!.props.rows).toStrictEqual([])
    expect(elements['request-details']).toBeUndefined()
    expect(elements.requests!.children).toStrictEqual(['requests-toolbar', 'requests-table'])
  })
})

describe('operations tab', () => {
  it('lists the queries and mutations of every API with their file and line, and the fragments in their own tab', async () => {
    const page = writeDocument('app/pages/index.vue', '<template>\n  <p>Don\'t miss out</p>\n</template>\n\n<script setup lang="ts">\nconst { data } = await useStorefrontData(`#graphql\n  query Products {\n    products(first: 3) { nodes { ...ProductCard } }\n  }\n\n  fragment ProductCard on Product { title }\n`)\n</script>\n')
    const menu = writeDocument('app/queries/menu.graphql', '# The main menu\nquery Menu {\n  menu(handle: "main") { title }\n}\n')
    const orders = writeDocument('server/api/orders.admin.ts', 'export default defineEventHandler(() => useAdmin().request(`#graphql\n  mutation CancelOrder { orderCancel { userErrors { message } } }\n`))\n')

    getDocumentFiles.mockReturnValue(new Map([
      [ShopifyClientType.Storefront, new Set([page, menu])],
      [ShopifyClientType.Admin, new Set([orders])],
    ]))

    const { spec } = await start()

    await vi.waitFor(() => expect(spec().elements['operations-table']!.props.rows).toHaveLength(3))

    const { elements } = spec()

    expect(elements['operations-table']!.props.rows).toStrictEqual([
      { api: 'Storefront', name: 'Products', type: 'query', file: 'app/pages/index.vue:7', path: page, line: 7 },
      { api: 'Storefront', name: 'Menu', type: 'query', file: 'app/queries/menu.graphql:2', path: menu, line: 2 },
      { api: 'Admin', name: 'CancelOrder', type: 'mutation', file: 'server/api/orders.admin.ts:2', path: orders, line: 2 },
    ])
    expect(elements['operations-hint']!.props.text).toBe('The GraphQL operations that the type generation found. Click one to open it in your editor.')
    expect(elements['fragments-table']!.props).toMatchObject({
      columns: [{ key: 'api', label: 'API' }, { key: 'name', label: 'Name' }, { key: 'file', label: 'File' }],
      rows: [{ api: 'Storefront', name: 'ProductCard', type: 'fragment', file: 'app/pages/index.vue:11', path: page, line: 11 }],
    })
    expect(elements.fragments!.children).toStrictEqual(['fragments-hint', 'fragments-table'])
    expect(elements['fragments-hint']!.props.text).toBe('The GraphQL fragments that the type generation found. Click one to open it in your editor.')
    expect(elements.tabs!.props.tabs).toStrictEqual([
      { value: 'requests', label: 'Requests', badge: undefined, badgeVariant: undefined },
      { value: 'operations', label: 'Operations', badge: '3', badgeVariant: undefined },
      { value: 'fragments', label: 'Fragments', badge: '1' },
      { value: 'config', label: 'Config' },
    ])
    expect(elements.tabs!.children).toStrictEqual(['requests', 'operations', 'fragments', 'config'])
  })

  it('has no fragments tab without fragments', async () => {
    const menu = writeDocument('app/queries/menu.graphql', 'query Menu {\n  menu(handle: "main") { title }\n}\n')

    getDocumentFiles.mockReturnValue(new Map([[ShopifyClientType.Storefront, new Set([menu])]]))

    const { spec } = await start()

    await vi.waitFor(() => expect(spec().elements['operations-table']!.props.rows).toHaveLength(1))

    const { elements } = spec()

    expect(elements.fragments).toBeUndefined()
    expect(elements['fragments-table']).toBeUndefined()
    expect(elements.tabs!.children).toStrictEqual(['requests', 'operations', 'config'])
    expect(elements.tabs!.props.tabs).toMatchObject([{ value: 'requests' }, { value: 'operations', badge: '1' }, { value: 'config' }])
  })

  it('opens the operation or fragment you click in your editor', async () => {
    const fragment = writeDocument('app/fragments/product.graphql', 'fragment ProductCard on Product { title }\n')

    getDocumentFiles.mockReturnValue(new Map([[ShopifyClientType.Storefront, new Set([fragment])]]))

    const { spec } = await start()

    await vi.waitFor(() => expect(spec().elements['fragments-table']).toBeDefined())

    const { elements } = spec()

    expect(elements['operations-table']!.props.value).toStrictEqual({ $bindState: '/operation' })
    expect(elements['operations-table']!.on).toStrictEqual({ rowClick: { action: 'devframes:service:open:open-in-editor', params: { path: { $state: '/operation/row/path' }, line: { $state: '/operation/row/line' } } } })
    expect(elements['fragments-table']!.props.value).toStrictEqual({ $bindState: '/fragment' })
    expect(elements['fragments-table']!.on).toStrictEqual({ rowClick: { action: 'devframes:service:open:open-in-editor', params: { path: { $state: '/fragment/row/path' }, line: { $state: '/fragment/row/line' } } } })
  })

  it('shows the type generation failures, and finds the operations again when Nuxt generates its templates', async () => {
    getGenerateFailures.mockReturnValue(['Failed to generate `shopify/admin/admin.operations.d.ts`: Syntax Error: Expected Name, found <EOF>.'])

    const { nuxt, spec } = await start()

    await vi.waitFor(() => expect(spec().elements['operations-failures']).toBeDefined())

    expect(spec().elements.operations!.children).toStrictEqual(['operations-hint', 'operations-failures', 'operations-table'])
    expect(spec().elements['operations-failures']).toStrictEqual({ type: 'Card', props: { title: 'Type generation failed' }, children: ['operations-failures-log'] })
    expect(spec().elements['operations-failures-log']).toStrictEqual({ type: 'CodeBlock', props: { code: 'Failed to generate `shopify/admin/admin.operations.d.ts`: Syntax Error: Expected Name, found <EOF>.' } })
    expect(spec().elements.tabs!.props.tabs).toMatchObject([{ value: 'requests' }, { value: 'operations', badge: '1', badgeVariant: 'danger' }, { value: 'config' }])

    const orders = writeDocument('server/api/orders.admin.ts', 'export const query = `#graphql\n  query Orders { orders(first: 1) { nodes { id } } }\n`\n')

    getDocumentFiles.mockReturnValue(new Map([[ShopifyClientType.Admin, new Set([orders])]]))
    getGenerateFailures.mockReturnValue([])

    await nuxt.callHook('app:templatesGenerated')

    await vi.waitFor(() => expect(spec().elements['operations-table']!.props.rows).toHaveLength(1))

    expect(spec().elements['operations-failures']).toBeUndefined()
    expect(spec().elements.operations!.children).toStrictEqual(['operations-hint', 'operations-table'])
  })

  it('finds the operations again when a file changes, as moving a query doesn\'t change the generated types', async () => {
    const shop = writeDocument('server/api/shop.ts', 'export const query = `#graphql\n  query Shop { shop { name } }\n`\n')

    getDocumentFiles.mockReturnValue(new Map([[ShopifyClientType.Storefront, new Set([shop])]]))

    const { nuxt, spec } = await start()

    await vi.waitFor(() => expect(spec().elements['operations-table']!.props.rows).toMatchObject([{ name: 'Shop', file: 'server/api/shop.ts:2' }]))

    writeDocument('server/api/shop.ts', 'import { shopName } from \'~/shop\'\n\nexport const query = `#graphql\n  query Shop { shop { name } }\n`\n')

    await nuxt.callHook('builder:watch', 'change', 'server/api/shop.ts')

    await vi.waitFor(() => expect(spec().elements['operations-table']!.props.rows).toMatchObject([{ name: 'Shop', file: 'server/api/shop.ts:4', line: 4 }]))
  })
})

describe('config tab', () => {
  it('shows the configuration fully expanded', async () => {
    const { spec } = await start()

    const { elements } = spec()

    expect(elements.config!.children).toStrictEqual(['config-tree'])
    expect(elements['config-tree']).toMatchObject({ type: 'Tree', props: { defaultExpanded: true } })
  })

  it.each([
    ['the private access token', 'clients.storefront.privateAccessToken', 'private-token'],
    ['custom headers', 'clients.storefront.headers', 'header-secret'],
    ['the server cache storage', 'clients.storefront.cache.server', 'storage-secret'],
    ['the session password', 'clients.customerAccount.session.password', 'session-secret'],
    ['the token storage', 'clients.customerAccount.tokenStorage', 'token-storage-secret'],
    ['the admin access token', 'clients.admin.accessToken', 'admin-token'],
    ['the admin client secret', 'clients.admin.clientSecret', 'client-secret'],
    ['the admin refresh token', 'clients.admin.refreshToken', 'refresh-token'],
    ['the webhook secret', 'webhooks.secret', 'webhook-secret'],
  ])('hides %s', async (_, path, secret) => {
    const { context } = await start()

    const shown = context.createJsonRenderer.mock.lastCall![0].elements['config-tree']!.props.data as Record<string, unknown>

    const value = path.split('.').reduce<unknown>((parent, key) => (parent as Record<string, unknown>)?.[key], shown)

    expect(value).toBeDefined()
    expect(JSON.stringify(value)).not.toContain(secret)
    expect(JSON.stringify(shown)).not.toContain(secret)
    expect(shown).toMatchObject({ name: 'shop', clients: { storefront: { apiVersion: API_VERSION, publicAccessToken: 'public-token', cache: { server: { driver: 'redis' } } } } })
  })
})
