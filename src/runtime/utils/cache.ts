import type { CacheOptions } from '../../module'

import { createStorage } from 'unstorage'
import lruCacheDriver from 'unstorage/drivers/lru-cache'

export const createCache = (options?: CacheOptions) => {
    if (!options) {
        return
    }

    return createStorage({
        driver: lruCacheDriver(options),
    })
}
