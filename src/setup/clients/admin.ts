import type { ShopifyClientSetupContext } from '../../types'

import { ShopifyClientType } from '../../schemas'
import { registerClientServerImports } from '../../utils/clients'
import { registerStorageMount } from '../../utils/storage'

export default function setupAdminClient({ nuxt, config, resolver }: ShopifyClientSetupContext) {
  const admin = config.clients[ShopifyClientType.Admin]

  if (!admin) return

  registerClientServerImports(ShopifyClientType.Admin, resolver)

  registerStorageMount(nuxt, 'admin-token', admin.tokenStorage)
}
