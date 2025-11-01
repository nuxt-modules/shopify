import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import {
    getConfiguredClients,
    isPublicClient,
    registerClientServerImports,
    registerClientImports,
} from '../utils/clients'

export default async function setupClients(config: ShopifyConfig) {
    const logger = useLogger()
    const clients = getConfiguredClients(config)

    for (const clientType of clients) {
        logger.debug(`Setting up ${clientType} client`)

        registerClientServerImports(clientType)

        if (isPublicClient(config.clients[clientType])) {
            registerClientImports(clientType)
        }
    }
}
