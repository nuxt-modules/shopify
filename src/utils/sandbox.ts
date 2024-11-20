import type {
    ShopifyClientType,
    ShopifyClientConfig,
    ShopifyConfig,
} from '../types'
import type { Nuxt } from '@nuxt/schema'

import { addServerHandler, createResolver, updateRuntimeConfig } from '@nuxt/kit'

const resolver = createResolver(import.meta.url)

export function getSandboxUrl(nuxt: Nuxt, clientType: ShopifyClientType) {
    const url = new URL(nuxt.options.devServer.url)

    return url.href + '_sandbox/' + clientType
}

export function getApiUrl(clientConfig?: ShopifyClientConfig) {
    if (!clientConfig) {
        throw new Error('Could not get API URL, check your config')
    }

    return `${clientConfig.storeDomain}/${clientConfig.apiVersion}/graphql.json`
}

export function getApiHeaders<T extends ShopifyClientType>(clientType: T, clientConfig: ShopifyConfig['clients'][T]) {
    if (!clientConfig) {
        throw new Error('Could not get API Token, check your config')
    }

    let accessTokenKey = ''
    let accessTokenValue = ''

    switch (clientType) {
        case 'storefront':
            accessTokenKey = 'X-Shopify-Storefront-Access-Token'
            // @ts-expect-error is validated by params
            accessTokenValue = clientConfig.privateAccessToken ?? clientConfig.publicAccessToken
            break
        case 'admin':
            accessTokenKey = 'X-Shopify-Access-Token'
            // @ts-expect-error is validated by params
            accessTokenValue = clientConfig.accessToken
            break
        default:
            throw new Error('Unknown client type')
    }

    return {
        'Content-Type': 'application/json',
        [accessTokenKey]: accessTokenValue,
    }
}

// Returns the URL to the sandbox
export function installSandbox<T extends ShopifyClientType>(
    nuxt: Nuxt,
    clientType: T,
    clientConfig: ShopifyConfig['clients'][T],
) {
    addServerHandler({
        handler: resolver.resolve('../runtime/server/handlers/sandbox.ts'),
        route: `/_sandbox/${clientType}`,
    })

    addServerHandler({
        handler: resolver.resolve('../runtime/server/handlers/proxy.ts'),
        route: `/api/_proxy/${clientType}`,
    })

    updateRuntimeConfig({
        _sandbox: {
            [clientType]: {
                url: getApiUrl(clientConfig),
                headers: getApiHeaders(clientType, clientConfig),
            },
        },
    })

    return getSandboxUrl(nuxt, clientType)
}
