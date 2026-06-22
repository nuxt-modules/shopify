import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addImports, addPlugin, addServerHandler, addServerImports } from '@nuxt/kit'
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
import { createStoreDomain } from '../runtime/utils/client'
import { SESSION_PASSWORD_ENV, generateSessionPassword, persistSessionPassword } from '../utils/session'

export default async function setupClients(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger(config)
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

      if (
        nuxt.options.runtimeConfig._shopify?.clients.customerAccount
        && nuxt.options.runtimeConfig.public._shopify?.clients.customerAccount
      ) {
        const apiUrl = await fetch(createStoreDomain(config.name) + '/.well-known/customer-account-api')
          .then(async res => (await res.json() as { graphql_api: string }).graphql_api)
          .catch(() => undefined)

        nuxt.options.runtimeConfig._shopify.clients.customerAccount.apiUrl = apiUrl
        nuxt.options.runtimeConfig.public._shopify.clients.customerAccount.apiUrl = apiUrl
      }

      const session = nuxt.options.runtimeConfig._shopify?.clients.customerAccount?.session

      if (session && !session.password) {
        const envPassword = process.env[SESSION_PASSWORD_ENV]

        if (envPassword) {
          session.password = envPassword
        }
        else if (nuxt.options.dev) {
          const password = generateSessionPassword()

          session.password = password

          await persistSessionPassword(nuxt.options.rootDir, password)

          logger.info('Generated a customer account session password and stored it in `.env`.')
        }
        else {
          logger.warn(`No customer account session password set. Set the \`${SESSION_PASSWORD_ENV}\` environment variable.`)
        }
      }

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

      if (nuxt.options.dev && customerAccount.dev?.tunnelURL && customerAccount.dev?.bridgeURL) {
        const bridgePath = withLeadingSlash(withoutHost(customerAccount.dev.bridgeURL))

        addServerHandler({
          method: 'get',
          route: bridgePath,
          handler: resolver.resolve('./runtime/server/api/auth/customer-account/bridge'),
        })

        // Resolve the bridge URL to an absolute dev-server URL so the handoff targets the real port.
        const bridgeURL = joinURL(nuxt.options.devServer.url, bridgePath)

        if (nuxt.options.runtimeConfig._shopify?.clients.customerAccount?.dev) {
          nuxt.options.runtimeConfig._shopify.clients.customerAccount.dev.bridgeURL = bridgeURL
        }
      }

      addImports([{
        from: resolver.resolve('./runtime/composables/customer-account/session'),
        name: 'useCustomerAccountSession',
      }])

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
