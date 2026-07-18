import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'

export default function setupAuth(nuxt: Nuxt, config: ShopifyConfig) {
  const logger = useLogger()

  const adminTokenStorageMount = typeof config.clients.admin?.tokenStorage === 'object'
    ? config.clients.admin.tokenStorage
    : undefined

  if (adminTokenStorageMount) {
    logger.debug('Mounting admin token storage at `admin-token`')

    nuxt.options.nitro.storage ??= {}
    nuxt.options.nitro.storage['admin-token'] = adminTokenStorageMount
  }

  const customerAccountTokenStorageMount = typeof config.clients.customerAccount?.tokenStorage === 'object'
    ? config.clients.customerAccount.tokenStorage
    : undefined

  if (customerAccountTokenStorageMount) {
    logger.debug('Mounting customer account token storage at `customer-account-token`')

    nuxt.options.nitro.storage ??= {}
    nuxt.options.nitro.storage['customer-account-token'] = customerAccountTokenStorageMount
  }
}
