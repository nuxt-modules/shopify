import type { ConsolaOptions } from 'consola'
import type { Storage } from 'unstorage'

import { createConsola } from 'consola'

const warned = new Set<string>()

export function warnUnmountedStorage(storage: Pick<Storage, 'getMount'>, base: string, logger?: Partial<ConsolaOptions>) {
  if (warned.has(base) || storage.getMount(base).base) return

  warned.add(base)

  createConsola(logger).withTag('shopify').warn(
    `No storage is mounted at \`${base}\`, so the module keeps its entries in Nitro's in-memory default storage, `
    + `which grows without limit and is emptied on every restart. Mount a storage at \`${base}\` in \`nitro.storage\` or in a Nitro plugin`,
  )
}
