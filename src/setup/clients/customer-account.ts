import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../../types'

import { addImports, addPlugin, addRouteMiddleware, addServerImports } from '@nuxt/kit'

import { CUSTOMER_ACCOUNT_PROXY_ROUTE } from '../../runtime/utils/clients/transport'
import { CUSTOMER_ACCOUNT_SESSION_ROUTE } from '../../runtime/utils/session'
import { ShopifyClientType } from '../../schemas'
import {
  registerClientAsyncImports,
  registerClientImports,
  registerClientServerImports,
  registerShopifyRoutes,
} from '../../utils/clients'
import { onDevServerURL } from '../../utils/dev'
import { useLogger } from '../../utils/log'
import { addUncachedServerHandler } from '../../utils/routes'
import { registerStorageMount } from '../../utils/storage'

type CustomerAccountConfig = NonNullable<ShopifyConfig['clients']['customerAccount']>

export function registerCustomerAccountRoutes(customerAccount: CustomerAccountConfig, resolver: Resolver) {
  addUncachedServerHandler({
    method: 'get',
    route: CUSTOMER_ACCOUNT_SESSION_ROUTE,
    handler: resolver.resolve('./runtime/server/api/customer-account/session'),
  })

  if (!customerAccount.proxy) return

  addUncachedServerHandler({
    method: 'post',
    route: CUSTOMER_ACCOUNT_PROXY_ROUTE,
    handler: resolver.resolve('./runtime/server/api/customer-account/proxy'),
  })
}

export function warnInsecureCustomerAccountDevServer(nuxt: Nuxt) {
  onDevServerURL(nuxt, (origin) => {
    const { protocol, hostname } = new URL(origin)

    if (protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return

    useLogger().warn(
      `The dev server runs on ${origin}, but Shopify only signs customers in on HTTPS origins other than localhost, so customer account login will fail. `
      + 'Run the dev server with `localHttps` from `@shopify/hydrogen/vite`, which serves it on `https://local.tryhydrogen.dev:5173`',
    )
  })
}

export function registerCustomerAccountSession(resolver: Resolver) {
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

  addRouteMiddleware({
    name: 'shopify:customer-account',
    path: resolver.resolve('./runtime/middleware/customer-account'),
    global: false,
  })

  addPlugin(resolver.resolve('./runtime/plugins/customer-account/session'))

  useLogger().debug('Registered customer account route middleware `shopify:customer-account`')
}

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

  registerStorageMount(nuxt, 'customer-account-token', customerAccount.tokenStorage, resolver)
}
