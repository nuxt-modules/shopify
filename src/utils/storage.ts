import type { Nuxt } from '@nuxt/schema'
import type { NitroConfig, StorageMounts } from 'nitropack'

import { useLogger } from './log'

export function registerStorageMount(nuxt: Nuxt, base: string, mount: StorageMounts[string] | string | false | undefined) {
  if (typeof mount !== 'object' || !mount) return

  useLogger().debug(`Mounting storage at \`${base}\``)

  const nitroConfig = nuxt.options.nitro as NitroConfig

  nitroConfig.storage ??= {}
  nitroConfig.storage[base] = mount
}
