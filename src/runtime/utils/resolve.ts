import type { ShopifyConfig } from '../../module'

import { createStoreDomain } from './clients/transport'
import { getCustomerAccountApiUrl } from './clients/customer-account/auth'

interface Logger {
  warn: (message: string) => void
}

function isApiUrlStale(config: ShopifyConfig, base?: ShopifyConfig) {
  const customerAccount = config.clients.customerAccount
  const baseCustomerAccount = base?.clients?.customerAccount

  if (!customerAccount) return false
  if (!customerAccount.apiURL) return true
  if (customerAccount.apiURL !== baseCustomerAccount?.apiURL) return false

  return config.name !== base?.name || customerAccount.apiVersion !== baseCustomerAccount.apiVersion
}

export async function resolveApiUrl(config: ShopifyConfig, base?: ShopifyConfig, logger?: Logger): Promise<ShopifyConfig> {
  if (!isApiUrlStale(config, base)) return config

  const customerAccount = config.clients.customerAccount!
  const storeDomain = createStoreDomain(config.name)

  const apiURL = await getCustomerAccountApiUrl(storeDomain, customerAccount.apiVersion)

  if (!apiURL) {
    logger?.warn(`Could not resolve the customer account API URL from \`${storeDomain}/.well-known/customer-account-api\``)

    return config
  }

  return {
    ...config,
    clients: {
      ...config.clients,
      customerAccount: { ...customerAccount, apiURL },
    },
  }
}
