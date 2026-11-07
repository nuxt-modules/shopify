import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loadNuxt } = vi.hoisted(() => ({ loadNuxt: vi.fn() }))

vi.mock('@nuxt/kit', () => ({ loadNuxt }))

const { default: command } = await import('#src/commands/webhooks')
const { getShopifyConfig } = await import('#src/utils/webhooks')

beforeEach(() => {
  loadNuxt.mockReset()
  loadNuxt.mockResolvedValue({ options: { runtimeConfig: { _shopify: { name: 'shop' } } } })
})

describe('webhooks command', () => {
  it('refuses an unknown action before loading the app, so the CLI exits with an error', async () => {
    await expect(command.run!({ args: { action: 'lsit' } } as never)).rejects.toThrow('lsit')

    expect(loadNuxt).not.toHaveBeenCalled()
  })
})

describe('getShopifyConfig', () => {
  it('loads the app like a build, so an invalid webhooks config fails the command instead of being skipped', async () => {
    await expect(getShopifyConfig()).resolves.toEqual({ name: 'shop' })

    expect(loadNuxt).toHaveBeenCalledExactlyOnceWith({ dotenv: true })
  })
})
