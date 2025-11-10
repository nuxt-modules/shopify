/* eslint-disable @typescript-eslint/no-explicit-any */
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

export const withCache = <F extends (...args: any[]) => any, T extends Parameters<F>>(cache: ReturnType<typeof createCache>, fn: F, ...args: T) => {
    return fn(...args) as ReturnType<F>
}
