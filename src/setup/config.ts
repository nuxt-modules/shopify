import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addNitroPlugin } from '@nuxt/kit'
import { defu } from 'defu'

import { publicConfigSchema } from '../schemas'
import { isCustomerAccountEnabled } from '../runtime/utils/session'
import { useLogger } from '../utils/log'

type ProxiedClients = { clients?: Record<string, { proxy?: boolean } | undefined> }

export default function setupConfig(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const publicConfig = publicConfigSchema.parse(config)

  Object.assign(nuxt.options.runtimeConfig, defu({
    _shopify: config,

    public: {
      _shopify: publicConfig,
    },
  }, nuxt.options.runtimeConfig))

  nuxt.options.runtimeConfig.shopify = config

  nuxt.hook('nitro:init', (nitro) => {
    // Runs before the other plugins so their Shopify requests use it too. Runtimes other than Node never load undici
    if (nitro.options.node !== false) nitro.options.plugins.unshift(resolver.resolve('./runtime/server/plugins/dispatcher'))

    if (!nitro.options.static) return

    const logger = useLogger()
    const { preset } = nitro.options

    if (config.analytics) {
      logger.warn(`The \`${preset}\` preset has no server for the paths Shopify's scripts call, so analytics events only reach Shopify if your host forwards them to your store`)
    }

    if (isCustomerAccountEnabled(config)) {
      logger.warn(`The \`${preset}\` preset has no server for the customer account routes, so customers can't sign in and prerendered pages must not call the customer account client`)
    }

    const runtimeConfig = nitro.options.runtimeConfig as { shopify?: ProxiedClients, _shopify?: ProxiedClients, public?: { shopify?: ProxiedClients, _shopify?: ProxiedClients } }

    const clients = [runtimeConfig.shopify, runtimeConfig._shopify, runtimeConfig.public?.shopify, runtimeConfig.public?._shopify]
      .flatMap(moduleConfig => [moduleConfig?.clients?.storefront, moduleConfig?.clients?.customerAccount])
      .filter((client): client is { proxy: boolean } => !!client?.proxy)

    if (!clients.length) return

    for (const client of clients) client.proxy = false

    logger.info(`Disabling the proxies: the \`${preset}\` preset has no server, so browser requests go to Shopify directly`)
  })

  nuxt.options.nitro.virtual ??= {}
  nuxt.options.nitro.virtual['https://cdn.shopify.com/storefront/standard-events.js'] = 'export {}'

  addNitroPlugin(resolver.resolve('./runtime/server/plugins/config'))
}
