import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addImports, addPlugin, addRouteMiddleware, addServerHandler, addServerImports } from '@nuxt/kit'
import { joinURL, withLeadingSlash, withoutHost } from 'ufo'

import { useLogger } from '../utils/log'
import {
  getConfiguredClients,
  isPublicClient,
  registerClientImports,
  registerClientServerImports,
  registerClientAsyncImports,
} from '../utils/clients'
import { ShopifyClientType } from '../schemas'

export default function setupClients(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()
  const clients = getConfiguredClients(config)

  for (const clientType of clients) {
    logger.debug(`Setting up ${clientType} client`)

    registerClientServerImports(clientType, resolver)

    if (clientType !== ShopifyClientType.Admin && isPublicClient(config.clients[clientType])) {
      registerClientImports(clientType, resolver)
      registerClientAsyncImports(clientType, resolver)
    }

    if (clientType === ShopifyClientType.CustomerAccount && config.clients[clientType]) {
      const customerAccount = config.clients[clientType]

      addServerHandler({
        method: 'get',
        route: withLeadingSlash(customerAccount.loginURL),
        handler: resolver.resolve('./runtime/server/api/auth/customer-account/callback'),
      })

      addServerHandler({
        method: 'get',
        route: withLeadingSlash(customerAccount.logoutURL),
        handler: resolver.resolve('./runtime/server/api/auth/customer-account/logout'),
      })

      addServerHandler({
        method: 'get',
        route: withLeadingSlash(customerAccount.sessionURL),
        handler: resolver.resolve('./runtime/server/api/auth/customer-account/session'),
      })

      logger.debug(
        'Registered customer account auth routes: '
        + `\`${withLeadingSlash(customerAccount.loginURL)}\`, `
        + `\`${withLeadingSlash(customerAccount.logoutURL)}\`, `
        + `\`${withLeadingSlash(customerAccount.sessionURL)}\``,
      )

      if (nuxt.options.dev && customerAccount.dev?.tunnelURL && customerAccount.dev?.bridgeURL) {
        const bridgePath = withLeadingSlash(withoutHost(customerAccount.dev.bridgeURL))

        addServerHandler({
          method: 'get',
          route: bridgePath,
          handler: resolver.resolve('./runtime/server/api/auth/customer-account/bridge'),
        })

        const bridgeURL = joinURL(nuxt.options.devServer.url, bridgePath)

        if (nuxt.options.runtimeConfig._shopify?.clients.customerAccount?.dev) {
          nuxt.options.runtimeConfig._shopify.clients.customerAccount.dev.bridgeURL = bridgeURL
        }

        logger.debug(`Registered customer account dev bridge at \`${bridgePath}\``)
      }

      addImports([{
        from: resolver.resolve('./runtime/composables/customer-account/session'),
        name: 'useCustomerAccountSession',
      }])

      addRouteMiddleware({
        name: 'customer-account',
        path: resolver.resolve('./runtime/middleware/customer-account'),
        global: false,
      })

      logger.debug('Registered customer account route middleware `customer-account`')

      addServerImports([
        'getCustomerAccountSession',
        'requireCustomerAccountSession',
        'clearCustomerAccountSession',
      ].map(name => ({
        from: resolver.resolve('./runtime/server/utils/customer-account/session'),
        name,
      })))

      addPlugin(resolver.resolve('./runtime/plugins/customer-account/session'))
    }
  }
}
