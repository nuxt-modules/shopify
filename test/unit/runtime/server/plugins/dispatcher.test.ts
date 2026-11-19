import { Agent } from 'undici'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

  return { ...undici, Agent: SpiedAgent }
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
  })

  it('keeps Shopify requests on HTTP/1.1 when Node\'s fetch negotiates HTTP/2', async () => {
    stubUndiciVersion('8.12.2')

    plugin()

    expect(await getShopifyDispatcher()).toBeInstanceOf(Agent)
    expect(agentOptions).toEqual([{ allowH2: false, connections: 12 }])
  })

  it.each(['7.29.0', undefined])('leaves Shopify requests alone when Node\'s fetch is undici %s', async (version) => {
    stubUndiciVersion(version)

    plugin()

    expect(await getShopifyDispatcher()).toBeUndefined()
    expect(agentOptions).toEqual([])
  })
})
