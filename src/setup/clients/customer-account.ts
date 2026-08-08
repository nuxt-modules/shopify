import type { ShopifyClientSetupContext } from '../../types'

import { ShopifyClientType } from '../../schemas'
import {
  isPublicClient,
  registerClientAsyncImports,
  registerClientImports,
  registerClientServerImports,
  registerCustomerAccountAuthRoutes,
  registerCustomerAccountDevBridge,
  registerCustomerAccountSession,
} from '../../utils/clients'
import { registerStorageMount } from '../../utils/storage'

export default function setupCustomerAccountClient({ nuxt, config, resolver }: ShopifyClientSetupContext) {
  const customerAccount = config.clients[ShopifyClientType.CustomerAccount]

  if (!customerAccount) return

  registerClientServerImports(ShopifyClientType.CustomerAccount, resolver)

  if (isPublicClient(customerAccount)) {
    registerClientImports(ShopifyClientType.CustomerAccount, resolver)
    registerClientAsyncImports(ShopifyClientType.CustomerAccount, resolver)
  }

  registerCustomerAccountAuthRoutes(customerAccount, resolver)
  registerCustomerAccountDevBridge(nuxt, customerAccount, resolver)
  registerCustomerAccountSession(resolver)

  registerStorageMount(nuxt, 'customer-account-token', customerAccount.tokenStorage)
}
