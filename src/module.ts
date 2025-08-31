import type { Nuxt } from '@nuxt/schema'

import type { ModuleOptions, ShopifyConfig, ShopifyClientConfig, ShopifyStorefrontConfig } from './types'
import type { ShopifyClientType } from './utils'

import {
    createResolver,
    defineNuxtModule,
    useRuntimeConfig,
    updateRuntimeConfig,
    addImports,
    addServerImports,
} from '@nuxt/kit'
import { defu } from 'defu'
import { upperFirst } from 'scule'
import { joinURL } from 'ufo'

import {
    registerAutoImports,
    registerVirtualModuleTemplates,
    useLog,
    useShopifyConfig,
    useShopifyConfigValidation,
    installSandbox,
    registerTemplates,
} from './utils'
import {
    createStorefrontConfig,
} from './runtime/utils/clients/storefront'

const ROLLUP_REPLACE_VIRTUAL_MODULES = true

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    async setup(options, nuxt) {
        const runtimeConfig = useRuntimeConfig()
        const log = useLog(options.logger)

        const moduleOptions = useShopifyConfigValidation(defu(
            runtimeConfig.public.shopify,
            runtimeConfig.shopify,
            options,
        ))

        const resolver = createResolver(import.meta.url)

        if (moduleOptions.success) {
            log.start('Starting setup')

            const { config, publicConfig } = useShopifyConfig(moduleOptions.data)

            for (const _clientType in config.clients) {
                const clientType = _clientType as ShopifyClientType
                const clientConfig = config.clients[clientType]

                if (!clientConfig) continue

                setupClient(nuxt, config, clientType, clientConfig)
            }

            await nuxt.callHook('shopify:config', { nuxt, config })

            updateRuntimeConfig({
                _shopify: config,

                public: { _shopify: publicConfig },
            })

            registerAutoImports(nuxt, config, resolver)

            log.success('Finished setup')
        }
        else {
            log.info('Skipping setup: config not provided or invalid')
            log.info('See module configuration reference: https://konkonam.github.io/nuxt-shopify/configuration/module')
            log.debug(`Error while parsing module options:\n${moduleOptions.error}`)
        }

        if (ROLLUP_REPLACE_VIRTUAL_MODULES) {
            registerVirtualModuleTemplates(nuxt)
        }
    },
})

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
        from: resolver.resolve(`./runtime/server/utils/${functionName}`),
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
                from: resolver.resolve(`./runtime/composables/useStorefront`),
                name: 'useStorefront',
            },
            {
                from: resolver.resolve(`./runtime/composables/useAsyncStorefront`),
                name: 'useAsyncStorefront',
            },
        ])

        if (clientConfig.proxy) {
            if (!nuxt.options.ssr) {
                log.info('Server-side request proxying is only available in SSR mode, skipping proxy setup.')
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
}
