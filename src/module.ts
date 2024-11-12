import type { ModuleOptions, ModuleOptionsClients } from './types'
import type { ApiType } from '@shopify/api-codegen-preset'

import { generate } from '@graphql-codegen/cli'
import { addServerImportsDir, createResolver, useLogger, defineNuxtModule } from '@nuxt/kit'
import { shopifyApiTypes } from '@shopify/api-codegen-preset'
import { upperFirst } from 'scule'

import { useConfig } from './utils/useConfig'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.0.0',
        },
    },

    hooks: {
        'shopify:storefront:codegen': async (nuxt, codegenOptions) => {
            const logger = useLogger('nuxt-shopify')

            return generate({
                cwd: nuxt.options.rootDir,
                generates: shopifyApiTypes(codegenOptions),
                // silent: true,
                ignoreNoDocuments: true,
            })
                .then(() => logger.success(`Generated shopify API types for ${codegenOptions.apiType}`))
                .catch(error => logger.error(`Failed to generate shopify API types for ${codegenOptions.apiType}:\n${error.message}`))
        },
        'shopify:storefront:persist': async (nuxt, options) => {
            if (nuxt.options.runtimeConfig._shopify) {
                nuxt.options.runtimeConfig._shopify.clients.storefront = options
            }
        },
        'shopify:admin:persist': async (nuxt, options) => {
            if (nuxt.options.runtimeConfig._shopify) {
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

                if (apiOptions?.codegen) {
                    await nuxt.callHook(
                        'shopify:storefront:codegen',
                        nuxt,

                    )
                }

                addServerImportsDir(
                    resolver.resolve('./runtime/server/utils'),
                )

                await nuxt.callHook(
                    `shopify:${apiType}:persist`,
                    nuxt,
                    config.compile(apiTypeCapitalized),
                )
            }

            logger.success('Finished shopify setup')
        }
    },
})
