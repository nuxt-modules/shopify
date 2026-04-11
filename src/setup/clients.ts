import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addServerHandler, addTypeTemplate, hasNuxtModule } from '@nuxt/kit'
import defu from 'defu'
import { withoutProtocol } from 'ufo'

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
import { nuxtAuthUtilsTemplate } from '../templates/auth-utils'

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

    if (clientType === ShopifyClientType.CustomerAccount) {
      if (!hasNuxtModule('nuxt-auth-utils', nuxt)) {
        logger.warn('nuxt-auth-utils is required to use the Customer Account API client.')
        continue
      }

      const nuxtAuthUtilsConfig = {
        shopDomain: withoutProtocol(createStoreDomain(config.name)),
        clientId: config.clients[clientType]?.clientId,
        scope: config.clients[clientType]?.scope,
        redirectURL: config.clients[clientType]?.redirectURL,
      }

      nuxt.options.runtimeConfig.oauth = defu({
        shopifyCustomer: nuxtAuthUtilsConfig,
      }, nuxt.options.runtimeConfig.oauth || {})

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

      addServerHandler({
        method: 'get',
        route: '/_auth/customer-account/callback',
        handler: resolver.resolve('./runtime/server/api/auth/customer-account/callback'),
      })

      addServerHandler({
        method: 'get',
        route: '/_auth/customer-account/logout',
        handler: resolver.resolve('./runtime/server/api/auth/customer-account/logout'),
      })

      addTypeTemplate({
        filename: 'shopify/auth-utils.d.ts',
        getContents: () => nuxtAuthUtilsTemplate,
      }, {
        nuxt: true,
        nitro: true,
      })
    }
  }
}
