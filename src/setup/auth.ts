import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

export default async function setupAuth(nuxt: Nuxt, config: ShopifyConfig) {
  const adminTokenStorageMount = typeof config.clients.admin?.tokenStorage === 'object'
    ? config.clients.admin.tokenStorage
    : undefined

  if (adminTokenStorageMount) {
    nuxt.options.nitro.storage ??= {}
    nuxt.options.nitro.storage['admin-token'] = adminTokenStorageMount
  }

  const customerAccountTokenStorageMount = typeof config.clients.customerAccount?.tokenStorage === 'object'
    ? config.clients.customerAccount.tokenStorage
    : undefined

  if (customerAccountTokenStorageMount) {
    nuxt.options.nitro.storage ??= {}
    nuxt.options.nitro.storage['customer-account-token'] = customerAccountTokenStorageMount
  }
}
