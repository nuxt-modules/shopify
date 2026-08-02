import type { Nuxt } from '@nuxt/schema'

import { z } from 'zod'

import {
  ShopifyClientType,
  configObjectSchema,
  publicConfigSchema,
} from './config'
import { resolveConfig } from './resolve'

export const configSchema = configObjectSchema
  .extend({ _nuxt: z.any().optional().transform(v => v as Nuxt | undefined) })
  .transform(({ _nuxt, ...config }) => resolveConfig(config, _nuxt))

export type ModuleOptions = z.input<typeof configObjectSchema>
export type PublicModuleOptions = z.input<typeof publicConfigSchema>

export type ShopifyConfig = z.output<typeof configObjectSchema>
export type PublicShopifyConfig = z.output<typeof publicConfigSchema>

export {
  ShopifyClientType,

  configObjectSchema,
  publicConfigSchema,
}
