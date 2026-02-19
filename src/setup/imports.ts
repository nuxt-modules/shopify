import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import { getConfiguredClients } from '../utils/clients'
import {
    registerFragmentImports,
    registerClientTypeImports,
    registerUtilImports,
} from '../utils/imports'

export default async function setupImports(nuxt: Nuxt, config: ShopifyConfig, resolver: Resolver) {
    const logger = useLogger(config)
    const clients = getConfiguredClients(config)

    if (config.fragments?.autoImport) {
        logger.debug(`Auto-importing fragments from \`~${config.fragments.paths.join(', ~')}\``)

        registerFragmentImports(nuxt, config)
    }

    for (const clientType of clients) {
        const clientConfig = config.clients[clientType]

        if (clientConfig?.autoImport) {
            logger.debug(`Auto-importing ${clientType} types`)
            registerClientTypeImports(nuxt, config, clientType)
        }
    }

    registerUtilImports(config, resolver)
}
