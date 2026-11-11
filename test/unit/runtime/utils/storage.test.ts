import { createStorage } from 'unstorage'
import { describe, expect, it } from 'vitest'

import { warnUnmountedStorage } from '#src/runtime/utils/storage'
import { createLogReporter } from '#test/helpers/logger'

describe('warnUnmountedStorage', () => {
  it('warns once when nothing is mounted at the configured name, as Nitro then falls back to its in-memory storage', () => {
    const { log, logger } = createLogReporter()
    const storage = createStorage()

    warnUnmountedStorage(storage, 'redis-cache', logger)
    warnUnmountedStorage(storage, 'redis-cache', logger)

    expect(log).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'warn', args: [expect.stringContaining('`redis-cache`')] }), expect.anything())
  })

  it('stays quiet for a mounted storage', () => {
    const { log, logger } = createLogReporter()
    const storage = createStorage()

    storage.mount('session-store', createStorage().getMount().driver)

    warnUnmountedStorage(storage, 'session-store', logger)

    expect(log).not.toHaveBeenCalled()
  })
})
