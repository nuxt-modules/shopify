import type { ShopifyClientType } from '../schemas/config'
import type { ShopifyConfig } from '../types'

import { createResolver, addServerImports, addImports } from '@nuxt/kit'
import { upperFirst } from 'scule'

export function registerClientServerImports(clientType: ShopifyClientType) {
    const resolver = createResolver(import.meta.url)

    addServerImports([{
        from: resolver.resolve(`../runtime/server/utils/${clientType}`),
        name: `use${upperFirst(clientType)}`,
    }])
}

export function registerClientImports(clientType: ShopifyClientType) {
    const resolver = createResolver(import.meta.url)

    addImports([
        {
            from: resolver.resolve(`../runtime/composables/${clientType}`),
            name: `use${upperFirst(clientType)}`,
        },
        {
            from: resolver.resolve(`../runtime/composables/async/${clientType}`),
            name: `use${upperFirst(clientType)}Data`,
        },
    ])
}

export function isPublicClient(config: ShopifyConfig['clients'][ShopifyClientType]): boolean {
    return !!(
        (config as { publicAccessToken?: string })?.publicAccessToken
        || (config as { mock?: boolean })?.mock
    )
}

export function getConfiguredClients(config: ShopifyConfig): ShopifyClientType[] {
    const clients = []

    for (const clientType in config.clients) {
        if (config.clients[clientType as ShopifyClientType]) {
            clients.push(clientType as ShopifyClientType)
        }
    }

    return clients
}
