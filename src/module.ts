import type { ModuleOptions } from './types'
import type { ApiType } from '@shopify/api-codegen-preset'

import { addServerImportsDir, createResolver, useLogger, defineNuxtModule, useNuxt } from '@nuxt/kit'
import { upperFirst } from 'scule'

import { useCodegen, useConfig } from './utils'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    hooks: {
        'shopify:storefront:codegen': async params => useCodegen(params),
        'shopify:admin:codegen': async params => useCodegen(params),
        'shopify:customer:codegen': async params => useCodegen(params),
        'shopify:storefront:persist': async ({ nuxt, options }) => {
            if (nuxt.options.runtimeConfig._shopify && options) {
                nuxt.options.runtimeConfig._shopify.clients.storefront = options
            }
        },
        'shopify:admin:persist': async ({ nuxt, options }) => {
            if (nuxt.options.runtimeConfig._shopify && options) {
                nuxt.options.runtimeConfig._shopify.clients.admin = options
            }
        },
    },

    async setup(options, nuxt) {
        const logger = useLogger('nuxt-shopify')

        const availableApiTypes = Object.keys(options?.clients ?? {}) as Array<Lowercase<ApiType>>
        if (!availableApiTypes.length) {
            logger.warn('No shopify client configuration provided.')
        }
        else {
            logger.info('Starting shopify setup')

            const resolver = createResolver(import.meta.url)

            nuxt.options.runtimeConfig._shopify = {
                name: options.name,
                debug: options.debug,
                clients: {},
            }

            for (const apiType of availableApiTypes) {
                const _apiType = upperFirst(apiType) as ApiType
                const apiOptions = useConfig(options, _apiType)

                addServerImportsDir(
                    resolver.resolve('./runtime/server/utils'),
                )

                await nuxt.callHook(`shopify:${apiType}:persist`, {
                    nuxt,
                    options: apiOptions,
                })

                if (apiOptions?.codegen) {
                    await nuxt.callHook(`shopify:${apiType}:codegen`, {
                        nuxt,
                        options: {
                            ...(apiOptions.codegen ? apiOptions.codegen : {}),
                            apiVersion: apiOptions.apiVersion,
                            apiType: apiType.toLowerCase() as ApiType,
                        },
                    })
                }
            }

            logger.success('Finished shopify setup')
        }
    },
})
