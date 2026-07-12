import type { z } from 'zod'

import {
  ShopifyClientType,
  configSchema,
  publicConfigSchema,
} from './config'

export type ModuleOptions = z.input<typeof configSchema>
export type PublicModuleOptions = z.input<typeof publicConfigSchema>

export type ShopifyConfig = z.output<typeof configSchema>
export type PublicShopifyConfig = z.output<typeof publicConfigSchema>

export {
  ShopifyClientType,

  configSchema,
  publicConfigSchema,
}
