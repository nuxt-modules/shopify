import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../../types'

import { ShopifyClientType } from '../../schemas'
import { registerClientServerImports } from '../../utils/clients'
import { registerStorageMount } from '../../utils/storage'

export default function setupAdminClient(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
  const admin = config.clients[ShopifyClientType.Admin]

  if (!admin) return

  registerClientServerImports(ShopifyClientType.Admin, resolver)

  registerStorageMount(nuxt, 'admin-token', admin.tokenStorage, resolver)
}
