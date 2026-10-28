import type { Nuxt } from '@nuxt/schema'
import type { StorageMounts } from 'nitropack'

import { useLogger } from './log'

export function registerStorageMount(nuxt: Nuxt, base: string, mount: StorageMounts[string] | string | false | undefined) {
  if (typeof mount !== 'object' || !mount) return

  useLogger().debug(`Mounting storage at \`${base}\``)

  nuxt.options.nitro.storage ??= {}
  nuxt.options.nitro.storage[base] = mount
}
