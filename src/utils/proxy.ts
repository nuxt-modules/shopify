import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { addServerHandler } from '@nuxt/kit'
import { joinURL } from 'ufo'

import { ShopifyClientType } from '../schemas'

export function getProxyUrl(config: ShopifyConfig): string | undefined {
    const storefrontConfig = config.clients[ShopifyClientType.Storefront]

    if (!storefrontConfig?.proxy) return

    return typeof storefrontConfig.proxy === 'string' ? storefrontConfig.proxy : undefined
}

export function shouldEnableProxy(nuxt: Nuxt, config: ShopifyConfig): boolean {
    const storefrontConfig = config.clients[ShopifyClientType.Storefront]

    if (!storefrontConfig?.proxy) return false
    if (!nuxt.options.ssr) return false

    return true
}

export function registerProxy(nuxt: Nuxt, config: ShopifyConfig, clientType: ShopifyClientType, resolver: Resolver): string | false {
    const url = getProxyUrl(config)

    if (!url) return false

    addServerHandler({
        handler: resolver.resolve(`./runtime/server/api/proxy/${clientType}`),
        route: url,
    })

    return joinURL(nuxt.options.devServer.url, url)
}
