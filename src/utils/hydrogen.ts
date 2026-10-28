import { satisfies, tryParse } from 'verkit'

import { getInstalledVersion } from './install'

export const HYDROGEN = '@shopify/hydrogen'

const SHOPIFY_SCRIPTS_RANGE = '>=2026.10.0'

export async function supportsShopifyScripts(): Promise<boolean> {
  const version = await getInstalledVersion(HYDROGEN)

  return !!version && satisfies(version, SHOPIFY_SCRIPTS_RANGE)
}

export async function getHydrogenSchemaApiVersion(): Promise<string | undefined> {
  const version = await getInstalledVersion(HYDROGEN)
  const release = version ? tryParse(version) : undefined

  if (!release?.major || !release.minor) return undefined

  const apiReleaseMonth = release.minor - ((release.minor - 1) % 3)

  return `${release.major}-${String(apiReleaseMonth).padStart(2, '0')}`
}
