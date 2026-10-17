import { describe, expect, it } from 'vitest'

import { getInstalledVersion } from '#src/utils/install'

describe('getInstalledVersion', () => {
  it('reads the version of an installed package', async () => {
    await expect(getInstalledVersion('@shopify/hydrogen')).resolves.toMatch(/^\d{4}\.\d+\.\d+/)
  })

  it('returns nothing for a package that is not installed', async () => {
    await expect(getInstalledVersion('@nuxtjs/shopify-not-installed')).resolves.toBeUndefined()
  })
})
