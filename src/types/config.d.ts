import type { z } from 'zod'

import type {
    cacheSchema,
    configSchema,
    moduleOptionsSchema,
    publicModuleOptionsSchema,
} from '../schemas/config'

export type { ShopifyClientType } from '../schemas/config'

export type CacheOptions = z.infer<typeof cacheSchema>

export type ModuleOptions = z.infer<typeof moduleOptionsSchema>
export type PublicModuleOptions = z.infer<typeof publicModuleOptionsSchema>

export type ShopifyConfig = z.infer<typeof configSchema>['config']
export type PublicShopifyConfig = z.infer<typeof configSchema>['publicConfig']
