import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import { getConfiguredClients } from '../utils/clients'
import { registerTemplates } from '../utils/templates'

export default async function setupCodegen(nuxt: Nuxt, config: ShopifyConfig) {
    const logger = useLogger()
    const clients = getConfiguredClients(config)

    for (const clientType of clients) {
        const clientConfig = config.clients[clientType]

        if (!clientConfig) continue

        if (clientConfig.codegen?.skip) {
            logger.info(`Skipping type generation for ${clientType}`)
            continue
        }

        logger.debug(`Setting up code generation for ${clientType}`)

        registerTemplates(nuxt, config, clientType)
    }
}
