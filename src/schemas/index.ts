import type { z } from 'zod'

import type {
    moduleOptionsSchema,
    publicModuleOptionsSchema,
} from './config'

import { ShopifyClientType } from './config'
import { moduleOptionsSchemaWithDefaults as configSchema } from './runtime'

export {
    ShopifyClientType,

    configSchema,
}

export type ModuleOptions = z.infer<typeof moduleOptionsSchema>
export type PublicModuleOptions = z.infer<typeof publicModuleOptionsSchema>

export type ShopifyConfig = z.infer<typeof configSchema>['config']
export type PublicShopifyConfig = z.infer<typeof configSchema>['publicConfig']
