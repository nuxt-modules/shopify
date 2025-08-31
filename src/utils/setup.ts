import type { Nuxt } from 'nuxt/schema'

import type { ShopifyConfig, ShopifyClientConfig, ShopifyStorefrontConfig } from '../types'
import type { ShopifyClientType } from '../utils'

import {
    addImports,
    addServerImports,
    createResolver,
} from '@nuxt/kit'
import { upperFirst } from 'scule'
import { defu } from 'defu'
import { joinURL } from 'ufo'

import {
    installSandbox,
    registerTemplates,
    useLog,
} from '../utils'
import {
    createStorefrontConfig,
} from '../runtime/utils/clients/storefront'

export const setupClient = (
    nuxt: Nuxt,
    config: ShopifyConfig,
    clientType: ShopifyClientType,
    clientConfig: ShopifyClientConfig,
) => {
    const log = useLog(config.logger)

    const resolver = createResolver(import.meta.url)

    if (!clientConfig.skipCodegen) {
        registerTemplates(nuxt, clientType, clientConfig)
    }
    else {
        log.info(`Skipping type generation for ${clientType}`)
    }

    if (nuxt.options.dev && clientConfig.sandbox) {
        const url = installSandbox(nuxt, clientType)

        log.info(`${upperFirst(clientType)} sandbox available at: ${url}`)
    }

    const functionName = `use${upperFirst(clientType)}`

    addServerImports([{
        from: resolver.resolve(`../runtime/server/utils/${functionName}`),
        name: functionName,
    }])

    if (clientType === 'storefront') {
        setupStorefrontFeatures(nuxt, config, clientConfig)
    }
}

export const setupStorefrontFeatures = (nuxt: Nuxt, config: ShopifyConfig, clientConfig: ShopifyStorefrontConfig) => {
    const log = useLog(config.logger)

    const resolver = createResolver(import.meta.url)

    if (clientConfig.publicAccessToken?.length || clientConfig.mock) {
        addImports([
            {
                from: resolver.resolve(`../runtime/composables/useStorefront`),
                name: 'useStorefront',
            },
            {
                from: resolver.resolve(`../runtime/composables/useAsyncStorefront`),
                name: 'useAsyncStorefront',
            },
        ])
    }

    if (clientConfig.proxy) {
        if (!nuxt.options.ssr) {
            log.info('Server-side request proxying is only available in SSR mode, skipping setup.')
        }

        const url = typeof clientConfig.proxy === 'string'
            ? clientConfig.proxy
            : '_proxy/storefront'

        nuxt.options.routeRules = defu(nuxt.options.routeRules, {
            [url]: {
                proxy: createStorefrontConfig(config).apiUrl,
            },
        })

        if (nuxt.options.dev) {
            log.info(`Storefront proxy available at: ${joinURL(nuxt.options.devServer.url, url)}`)
        }
    }
}
