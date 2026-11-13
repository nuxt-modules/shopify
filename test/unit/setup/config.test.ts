import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { resolveModulePath } from 'exsolve'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'
import { resolver } from '#test/helpers/nuxt'

vi.mock('@nuxt/kit', () => ({ addServerPlugin: vi.fn() }))

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub({ warn }) }))

const { default: setupConfig } = await import('#src/setup/config')

const { configObjectSchema } = await import('#src/schemas')

function setup(input: Record<string, unknown> = {}) {
  const hooks = new Map<string, (nitro: unknown) => void>()
  const nuxt = {
    options: { nitro: {} as { virtual?: Record<string, string> }, runtimeConfig: { public: {} as Record<string, unknown> } as Record<string, unknown> },
    hook: (name: string, hook: (nitro: unknown) => void) => hooks.set(name, hook),
  }

  const config = configObjectSchema.parse({ name: 'shop', shopId: '1', clients: { storefront: { publicAccessToken: 'public' }, customerAccount: { clientId: 'client' } }, ...input })

  setupConfig(nuxt as never, config, resolver)

  return { hooks, nuxt }
}

function initNitro(nitroOptions: { static: boolean, preset: string }, input: Record<string, unknown> = {}) {
  const { hooks, nuxt } = setup(input)

  type ClientConfigs = { clients: Record<'storefront' | 'customerAccount', { proxy: boolean }> }

  const runtimeConfig = structuredClone(nuxt.options.runtimeConfig) as { shopify: ClientConfigs, _shopify: ClientConfigs, public: { _shopify: ClientConfigs } }

  hooks.get('nitro:init')!({ options: { ...nitroOptions, runtimeConfig } })

  return runtimeConfig
}

beforeEach(() => {
  warn.mockClear()
})

describe('static presets', () => {
  it('send browser requests to Shopify directly, since a static host serves neither proxy', () => {
    const runtimeConfig = initNitro({ static: true, preset: 'github_pages' })

    for (const moduleConfig of [runtimeConfig.shopify, runtimeConfig._shopify, runtimeConfig.public._shopify]) {
      expect(moduleConfig.clients.storefront.proxy).toBe(false)
      expect(moduleConfig.clients.customerAccount.proxy).toBe(false)
    }
  })

  it('warn that customers can\'t sign in and that Shopify\'s analytics paths are missing, as for nuxt generate', () => {
    initNitro({ static: true, preset: 'github_pages' }, { analytics: true })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('customers can\'t sign in'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('analytics events only reach Shopify if your host forwards them'))
  })

  it('keep the proxies on a preset with a server', () => {
    const runtimeConfig = initNitro({ static: false, preset: 'node-server' }, { analytics: true })

    expect(runtimeConfig.public._shopify.clients.storefront.proxy).toBe(true)
    expect(runtimeConfig._shopify.clients.customerAccount.proxy).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('worker presets', () => {
  it('replace each remote import in Hydrogen with an empty module on the server, as they can\'t bundle a URL', () => {
    const hydrogen = dirname(dirname(resolveModulePath('@shopify/hydrogen', { from: import.meta.url })))

    const remoteImports = readdirSync(hydrogen, { recursive: true, encoding: 'utf8' })
      .filter(file => file.endsWith('.mjs'))
      .flatMap(file => [...readFileSync(join(hydrogen, file), 'utf8').matchAll(/import\("(https?:\/\/[^"]+)"\)/g)].map(match => match[1]))

    expect(setup().nuxt.options.nitro.virtual).toStrictEqual(Object.fromEntries(remoteImports.map(url => [url, 'export {}'])))
  })
})
