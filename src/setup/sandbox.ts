import type { ShopifyConfig } from '../types'

import type { Nuxt } from '@nuxt/schema'

import { upperFirst } from 'scule'

import { useLogger } from '../utils/log'
import { getConfiguredClients } from '../utils/clients'
import {
    registerSandbox,
    shouldEnableSandbox,
} from '../utils/sandbox'

export default async function setupSandbox(nuxt: Nuxt, config: ShopifyConfig) {
    const logger = useLogger()
    const clients = getConfiguredClients(config)

    for (const clientType of clients) {
        const clientConfig = config.clients[clientType]

        if (shouldEnableSandbox(nuxt, clientConfig)) {
            const url = registerSandbox(nuxt, clientType)

            logger.info(`${upperFirst(clientType)} sandbox available at: ${url}`)
        }
    }
}
