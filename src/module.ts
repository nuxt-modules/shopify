import type { ApiClientOptions, ModuleOptions, ModuleOptionsClients, ShopifyPersistHookName } from './types'
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
        'shopify:codegen': async (nuxt, codegenOptions) => {
            const logger = useLogger('nuxt-shopify')

            try {
                return generate({
                    cwd: nuxt.options.rootDir,
                    generates: shopifyApiTypes(codegenOptions),
                    // silent: true,
                    ignoreNoDocuments: true,
                }).then(() => {
                    logger.success(`Generated shopify API types for ${codegenOptions.apiType}`)
                })
            }
            catch (error) {
                // @ts-expect-error - error is not an instanceof Error
                logger.error(`Failed to generate shopify API types for ${codegenOptions.apiType}:\n${error.message}`)
            }
        },
        'shopify:storefront:persist': async (nuxt, options) => {
            // @ts-expect-error Union loss due to copy
            nuxt.options.runtimeConfig._shopify.clients[options._apiType] = options
        },
    },

    async setup(options, nuxt) {
        const logger = useLogger('nuxt-shopify')

        if (!options?.clients) {
            logger.warn('No shopify module configuration provided.')
        }
        else {
            logger.info('Starting shopify setup')

            const resolver = createResolver(import.meta.url)
            const availableApiTypes = Object.keys(options.clients) as unknown as Array<keyof ModuleOptionsClients>
            const config = useConfig(options)

            nuxt.options.runtimeConfig._shopify = {
                name: options.name,
                debug: options.debug,
                clients: {},
            }

            for (const apiType of availableApiTypes) {
                const apiTypeCapitalized = upperFirst(apiType) as ApiType
                const codegenOptions = config.getCodegen(apiTypeCapitalized)

                if (codegenOptions) {
                    await nuxt.callHook('shopify:codegen', nuxt, codegenOptions)
                }

                addServerImportsDir(
                    resolver.resolve('./runtime/server/utils'),
                )

                await nuxt.callHook(
                    `shopify:${apiType}:persist`,
                    // @ts-expect-error dynamic key
                    nuxt,
                    config.compile(apiTypeCapitalized),
                )
            }

            logger.success('Finished shopify setup')
        }
    },
})
