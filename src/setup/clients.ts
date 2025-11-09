import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addPlugin, addServerPlugin } from '@nuxt/kit'

import { useLogger } from '../utils/log'
import {
    getConfiguredClients,
    isPublicClient,
    registerClientServerImports,
    registerClientImports,
    hasPublicClient,
} from '../utils/clients'

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

    if (clients.length > 0) {
        addServerPlugin(resolver.resolve('./runtime/server/plugins/cache'))
    }

    if (hasPublicClient(config)) {
        addPlugin(resolver.resolve('./runtime/plugins/cache'))
    }
}
