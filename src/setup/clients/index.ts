import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../../types'

import { kebabCase } from 'scule'

import { ShopifyClientType } from '../../schemas'
import { getConfiguredClients } from '../../utils/clients'
import { useLogger } from '../../utils/log'
import setupAdminClient from './admin'
import setupCustomerAccountClient from './customer-account'
import setupStorefrontClient from './storefront'

const clientSetups: Record<ShopifyClientType, (nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) => void> = {
  [ShopifyClientType.Storefront]: setupStorefrontClient,
  [ShopifyClientType.CustomerAccount]: setupCustomerAccountClient,
  [ShopifyClientType.Admin]: setupAdminClient,
}

export default function setupClients(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const logger = useLogger()

  for (const clientType of getConfiguredClients(config)) {
    logger.debug(`Setting up the ${kebabCase(clientType)} client`)

    clientSetups[clientType](nuxt, config, resolver)
  }
}
