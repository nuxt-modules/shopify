import type { Dispatcher } from 'undici'

import { once } from 'node:events'
import { createServer } from 'node:http'

import { Agent, EnvHttpProxyAgent } from 'undici'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'

import { getShopifyDispatcher } from '#src/runtime/utils/clients/fetch'

const agentOptions = vi.hoisted(() => [] as unknown[])

vi.mock('nitropack/runtime', () => ({ defineNitroPlugin: (plugin: unknown) => plugin }))

vi.mock('undici', async (importOriginal) => {
  const undici = await importOriginal<typeof import('undici')>()

  class SpiedAgent extends undici.Agent {
    constructor(options?: ConstructorParameters<typeof undici.Agent>[0]) {
      super(options)
      agentOptions.push(options)
    }
  }

  class SpiedEnvHttpProxyAgent extends undici.EnvHttpProxyAgent {
    constructor(options?: ConstructorParameters<typeof undici.EnvHttpProxyAgent>[0]) {
      super(options)
      agentOptions.push(options)
    }
  }

  return { ...undici, Agent: SpiedAgent, EnvHttpProxyAgent: SpiedEnvHttpProxyAgent }
})

const plugin = (await import('#src/runtime/server/plugins/dispatcher')).default as unknown as () => void

const undiciVersion = Object.getOwnPropertyDescriptor(process.versions, 'undici')!

function stubUndiciVersion(version: string | undefined) {
  Object.defineProperty(process.versions, 'undici', { ...undiciVersion, value: version })
}

describe('dispatcher plugin', () => {
  afterEach(() => {
    Object.defineProperty(process.versions, 'undici', undiciVersion)
    Reflect.deleteProperty(globalThis, Symbol.for('nuxt-shopify:dispatcher'))
    agentOptions.length = 0
    vi.unstubAllEnvs()
  })

  it('keeps Shopify requests on HTTP/1.1 when Node\'s fetch negotiates HTTP/2', async () => {
    stubUndiciVersion('8.12.2')

    vi.stubEnv('NODE_USE_ENV_PROXY', undefined)
    vi.stubEnv('NODE_OPTIONS', undefined)

    plugin()

    expect(await getShopifyDispatcher()).toBeInstanceOf(Agent)
    expect(agentOptions).toEqual([{ allowH2: false, connections: 12 }])
  })

  it.each([
    { NODE_USE_ENV_PROXY: '1' },
    { NODE_OPTIONS: '--max-old-space-size=4096 --use-env-proxy' },
  ])('keeps going through Node\'s env proxy with %o', async (env) => {
    stubUndiciVersion('8.12.2')

    const proxy = createServer()
    const tunnels: string[] = []

    proxy.on('connect', (request, socket) => {
      tunnels.push(request.url!)
      socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n')
    })

    proxy.listen(0, '127.0.0.1')
    await once(proxy, 'listening')
    onTestFinished(() => void proxy.close())

    const { port } = proxy.address() as { port: number }

    for (const name of ['https_proxy', 'NO_PROXY', 'no_proxy', 'NODE_USE_ENV_PROXY', 'NODE_OPTIONS']) vi.stubEnv(name, undefined)

    vi.stubEnv('HTTPS_PROXY', `http://127.0.0.1:${port}`)

    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)

    plugin()

    const dispatcher = await getShopifyDispatcher() as Dispatcher

    expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent)
    expect(agentOptions).toEqual([{ allowH2: false, connections: 12 }])

    await expect(dispatcher.request({ origin: 'https://shop.myshopify.com', path: '/', method: 'GET' })).rejects.toThrow()

    expect(tunnels).toEqual(['shop.myshopify.com:443'])
  })

  it.each([
    { NODE_OPTIONS: '--use-env-proxy --no-use-env-proxy' },
    { NODE_OPTIONS: '--use-env-proxy', execArgv: ['--no-use-env-proxy'] },
    { NODE_USE_ENV_PROXY: '1', execArgv: ['--no-use-env-proxy'] },
  ])('connects directly when a later flag turns Node\'s env proxy off with %o', async ({ execArgv, ...env }) => {
    stubUndiciVersion('8.12.2')

    vi.stubEnv('NODE_USE_ENV_PROXY', undefined)
    vi.stubEnv('NODE_OPTIONS', undefined)

    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)

    if (execArgv) {
      const original = process.execArgv

      process.execArgv = execArgv
      onTestFinished(() => void (process.execArgv = original))
    }

    plugin()

    const dispatcher = await getShopifyDispatcher()

    expect(dispatcher).toBeInstanceOf(Agent)
    expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent)
  })

  it.each(['7.29.0', undefined])('leaves Shopify requests alone when Node\'s fetch is undici %s', async (version) => {
    stubUndiciVersion(version)

    plugin()

    expect(await getShopifyDispatcher()).toBeUndefined()
    expect(agentOptions).toEqual([])
  })
})
