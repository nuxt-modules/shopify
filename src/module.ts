import type { ModuleOptions } from './types'
import type { ApiType } from '@shopify/api-codegen-preset'

import { addServerImportsDir, createResolver, useLogger, defineNuxtModule } from '@nuxt/kit'
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
        'shopify:storefront:codegen': async ({ nuxt, generates }) => {
            const logger = useLogger('nuxt-shopify')

            return useCodegen({
                cwd: nuxt.options.rootDir,
                generates,
                // silent: true,
                ignoreNoDocuments: true,
            })
                .then(() => logger.success('Generated shopify API types for storefront'))
                .catch(error => logger.error(`Failed to generate shopify API types for storefront:\n${error.message}`))
        },
        'shopify:storefront:persist': async (nuxt, options) => {
            if (nuxt.options.runtimeConfig._shopify && options) {
                nuxt.options.runtimeConfig._shopify.clients.storefront = options
            }
        },
        'shopify:admin:persist': async (nuxt, options) => {
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
            const config = useConfig(options)

            nuxt.options.runtimeConfig._shopify = {
                name: options.name,
                debug: options.debug,
                clients: {},
            }

            for (const apiType of availableApiTypes) {
                const _apiType = upperFirst(apiType) as ApiType
                const apiOptions = config.compile(_apiType)

                addServerImportsDir(
                    resolver.resolve('./runtime/server/utils'),
                )

                await nuxt.callHook(
                    `shopify:${apiType}:persist`,
                    nuxt,
                    config.compile(_apiType),
                )

                if (apiOptions?.codegen) {
                    await nuxt.callHook(`shopify:${apiType}:codegen`, nuxt, apiOptions.codegen)
                }
            }

            logger.success('Finished shopify setup')
        }
    },
})
