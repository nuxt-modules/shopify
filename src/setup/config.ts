import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addServerPlugin } from '@nuxt/kit'
import { defu } from 'defu'

import { publicConfigSchema } from '../schemas'

export default function setupConfig(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const publicConfig = publicConfigSchema.parse(config)

  Object.assign(nuxt.options.runtimeConfig, defu({
    _shopify: config,

    public: {
      _shopify: publicConfig,
    },
  }, nuxt.options.runtimeConfig))

  nuxt.options.runtimeConfig.shopify = config

  addServerPlugin(resolver.resolve('./runtime/server/plugins/config'))
}
