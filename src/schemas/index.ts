import type { z } from 'zod'

import {
  ShopifyClientType,
  configObjectSchema,
  publicConfigSchema,
} from '../runtime/utils/config'

export type ModuleOptions = z.input<typeof configObjectSchema>
export type PublicModuleOptions = z.input<typeof publicConfigSchema>

export type ShopifyConfig = z.output<typeof configObjectSchema>
export type PublicShopifyConfig = z.output<typeof publicConfigSchema>

export {
  ShopifyClientType,

  configObjectSchema,
  publicConfigSchema,
}
