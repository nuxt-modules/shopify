import { describe, expect, it } from 'vitest'

import { registerStorageMount } from '#src/utils/storage'
import { resolver } from '#test/helpers/nuxt'

function register(mount: { driver: string, [option: string]: unknown }) {
  const hooks = new Map<string, (nitro: unknown) => void>()
  const nuxt = {
    options: { nitro: {} as { storage?: Record<string, unknown> } },
    hook: (name: string, hook: (nitro: unknown) => void) => hooks.set(name, hook),
  }

  registerStorageMount(nuxt as never, 'customer-account-token', mount, resolver)

  const nitro = { options: { storage: { ...nuxt.options.nitro.storage } } }

  hooks.get('nitro:init')?.(nitro)

  return { config: nuxt.options.nitro.storage, bundled: nitro.options.storage }
}

describe('registerStorageMount', () => {
  it('bundles the module\'s own `lru-cache` driver, which keeps the ttl of each entry, and leaves Nitro\'s build-time import the builtin name', () => {
    const { config, bundled } = register({ driver: 'lru-cache', max: 10_000 })

    expect(config).toStrictEqual({ 'customer-account-token': { driver: 'lru-cache', max: 10_000 } })
    expect(bundled).toStrictEqual({ 'customer-account-token': { driver: './runtime/utils/lru-driver', max: 10_000 } })
  })

  it('bundles any other driver as configured', () => {
    const { config, bundled } = register({ driver: 'redis', host: 'localhost' })

    expect(bundled).toStrictEqual(config)
    expect(bundled).toStrictEqual({ 'customer-account-token': { driver: 'redis', host: 'localhost' } })
  })
})
