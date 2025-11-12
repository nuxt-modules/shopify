import type { Resolver } from '@nuxt/kit'

import type { ShopifyConfig } from '../types'

import { addServerImports, addImports } from '@nuxt/kit'
import { upperFirst } from 'scule'

import { ShopifyClientType } from '../schemas'

export function registerClientServerImports(clientType: ShopifyClientType, resolver: Resolver) {
    addServerImports([{
        from: resolver.resolve(`./runtime/server/utils/${clientType}`),
        name: `use${upperFirst(clientType)}`,
    }])
}

export function registerClientImports(clientType: ShopifyClientType, resolver: Resolver) {
    addImports([
        {
            from: resolver.resolve(`./runtime/composables/${clientType}`),
            name: `use${upperFirst(clientType)}`,
        },
        {
            from: resolver.resolve(`./runtime/composables/async/${clientType}`),
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

export function hasPublicClient(config: ShopifyConfig): boolean {
    const storefrontConfig = config.clients[ShopifyClientType.Storefront]

    return !!(storefrontConfig?.publicAccessToken || storefrontConfig?.mock)
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
