import type { z } from 'zod'

import type {
    moduleOptionsSchema,
    publicModuleOptionsSchema,
} from './config'

import { ShopifyClientType } from './config'
import {
    moduleOptionsSchemaWithDefaults as configSchema,
    publicModuleOptionsSchemaWithDefaults as publicConfigSchema,
} from './runtime'

export type ModuleOptions = z.infer<typeof moduleOptionsSchema>
export type PublicModuleOptions = z.infer<typeof publicModuleOptionsSchema>

export type ShopifyConfig = z.infer<typeof configSchema>
export type PublicShopifyConfig = z.infer<typeof publicConfigSchema>

export {
    ShopifyClientType,

    configSchema,
    publicConfigSchema,
}
