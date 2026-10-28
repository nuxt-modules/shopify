import { beforeEach, describe, expect, it, vi } from 'vitest'

let installedVersion: string | undefined

vi.mock('#src/utils/install', () => ({
  getInstalledVersion: () => Promise.resolve(installedVersion),
}))

const { getHydrogenSchemaApiVersion, supportsShopifyScripts } = await import('#src/utils/hydrogen')

beforeEach(() => {
  installedVersion = undefined
})

describe('supportsShopifyScripts', () => {
  it.each([
    ['2026.10.0', true],
    ['2026.10.2', true],
    ['2027.1.0', true],
    ['2026.10.0-preview.5', false],
    ['2026.4.6', false],
    ['2024.10.2', false],
  ])('reads hydrogen %s as %s', async (version, expected) => {
    installedVersion = version

    await expect(supportsShopifyScripts()).resolves.toBe(expected)
  })

  it('is false without hydrogen', async () => {
    await expect(supportsShopifyScripts()).resolves.toBe(false)
  })
})

describe('getHydrogenSchemaApiVersion', () => {
  it.each([
    ['2026.10.2', '2026-10'],
    ['2026.4.6', '2026-04'],
    ['2025.5.0', '2025-04'],
    ['2024.1.0', '2024-01'],
  ])('reads hydrogen %s as API version %s', async (version, expected) => {
    installedVersion = version

    await expect(getHydrogenSchemaApiVersion()).resolves.toBe(expected)
  })

  it('has no API version without hydrogen', async () => {
    await expect(getHydrogenSchemaApiVersion()).resolves.toBeUndefined()
  })
})
