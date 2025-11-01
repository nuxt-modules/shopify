import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import {
    getConfiguredClients,
    isPublicClient,
    registerClientServerImports,
    registerClientImports,
} from '../utils/clients'
import type { Resolver } from '@nuxt/kit'

export default async function setupClients(config: ShopifyConfig, resolver: Resolver) {
    const logger = useLogger()
    const clients = getConfiguredClients(config)

    for (const clientType of clients) {
        logger.debug(`Setting up ${clientType} client`)

        registerClientServerImports(clientType, resolver)

        if (isPublicClient(config.clients[clientType])) {
            registerClientImports(clientType, resolver)
        }
    }
}
