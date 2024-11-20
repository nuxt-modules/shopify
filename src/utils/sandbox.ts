import type {
    ShopifyClientType,
} from '../types'
import type { Nuxt } from '@nuxt/schema'

import { addServerHandler, createResolver } from '@nuxt/kit'

const resolver = createResolver(import.meta.url)

export function getSandboxUrl(nuxt: Nuxt, clientType: ShopifyClientType) {
    const url = new URL(nuxt.options.devServer.url)

    return url.href + '_sandbox/' + clientType
}

// Returns the URL to the sandbox
export function installSandbox<T extends ShopifyClientType>(
    nuxt: Nuxt,
    clientType: T,
) {
    addServerHandler({
        handler: resolver.resolve('../runtime/server/handlers/sandbox.ts'),
        route: `/_sandbox/${clientType}`,
    })

    addServerHandler({
        handler: resolver.resolve('../runtime/server/handlers/proxy.ts'),
        route: `/api/_proxy/${clientType}`,
    })

    return getSandboxUrl(nuxt, clientType)
}
