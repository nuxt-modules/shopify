import { beforeEach, describe, expect, it, vi } from 'vitest'

const { close, loadNuxt } = vi.hoisted(() => ({ close: vi.fn(), loadNuxt: vi.fn() }))

vi.mock('@nuxt/kit', () => ({ loadNuxt }))

const { default: command } = await import('#src/commands/webhooks')
const { getShopifyConfig } = await import('#src/utils/webhooks')

beforeEach(() => {
  close.mockReset()
  loadNuxt.mockReset()
  loadNuxt.mockResolvedValue({ options: { runtimeConfig: { _shopify: { name: 'shop' } } }, close })
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

    expect(loadNuxt).toHaveBeenCalledOnce()

    const [options] = loadNuxt.mock.calls[0]!

    expect(options).not.toHaveProperty('dev', true)
    expect(options).not.toHaveProperty('overrides._prepare', true)
    expect(options).not.toHaveProperty('dotenv', false)
  })

  it('closes the app it loaded, also when the module is not configured', async () => {
    await getShopifyConfig()

    loadNuxt.mockResolvedValueOnce({ options: { runtimeConfig: {} }, close })

    await expect(getShopifyConfig()).rejects.toThrow('module is not configured')

    expect(close).toHaveBeenCalledTimes(2)
  })
})
