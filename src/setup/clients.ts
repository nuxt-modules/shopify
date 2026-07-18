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

      if (
        nuxt.options.runtimeConfig._shopify?.clients.customerAccount
        && nuxt.options.runtimeConfig.public._shopify?.clients.customerAccount
      ) {
        const wellKnownURL = createStoreDomain(config.name) + '/.well-known/customer-account-api'

        const apiUrl = await fetch(wellKnownURL)
          .then(async res => (await res.json() as { graphql_api: string }).graphql_api)
          .catch(() => undefined)

        if (apiUrl) {
          logger.debug(`Resolved customer account API URL: ${apiUrl}`)
        }
        else {
          logger.warn(
            `Could not resolve the customer account API URL from \`${wellKnownURL}\` - `
            + 'customer account requests will fail (is the Customer Account API enabled for your store?)',
          )
        }

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

          logger.info('Generated a customer account session password in `.env`')
        }
        else {
          logger.warn(`No customer account session password set - customer account sessions will fail until the \`${SESSION_PASSWORD_ENV}\` environment variable is set`)
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
