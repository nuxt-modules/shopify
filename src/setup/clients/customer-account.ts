import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../../types'

import { ShopifyClientType } from '../../schemas'
import {
  registerClientAsyncImports,
  registerClientImports,
  registerClientServerImports,
  registerCustomerAccountRoutes,
  registerCustomerAccountSession,
  registerShopifyRoutes,
  warnInsecureCustomerAccountDevServer,
} from '../../utils/clients'
import { useLogger } from '../../utils/log'
import { registerStorageMount } from '../../utils/storage'

export default function setupCustomerAccountClient(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const customerAccount = config.clients[ShopifyClientType.CustomerAccount]

  if (!customerAccount) return

  registerClientServerImports(ShopifyClientType.CustomerAccount, resolver)
  registerClientImports(ShopifyClientType.CustomerAccount, resolver)
  registerClientAsyncImports(nuxt, ShopifyClientType.CustomerAccount, resolver)

  if (!config.clients.storefront && !(config.defaultMarket?.country && config.defaultMarket.language)) {
    useLogger().warn('Customer sign-in needs the market of each request, and without the storefront client the module can\'t look up your shop\'s default market. Set `defaultMarket`, or set `event.context.shopifyMarket` in a Nitro plugin')
  }

  registerShopifyRoutes(nuxt, config, resolver)
  registerCustomerAccountRoutes(customerAccount, resolver)
  registerCustomerAccountSession(resolver)

  warnInsecureCustomerAccountDevServer(nuxt)

  registerStorageMount(nuxt, 'customer-account-token', customerAccount.tokenStorage)
}
