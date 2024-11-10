import type { ModuleOptions } from './types'
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
            try {
                await generate({
                    cwd: nuxt.options.rootDir,
                    generates: shopifyApiTypes(codegenOptions),
                    silent: true,
                })
            }
            catch (error) {
                if (error instanceof Error) {
                    useLogger('nuxt-shopify').error(
                        `Failed to generate shopify API types for ${codegenOptions.apiType}:\n${error.message}`,
                    )
                }
            }
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
            const availableApiTypes = Object.keys(options.clients)

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

                // @ts-expect-error Union loss due to copy
                nuxt.options.runtimeConfig._shopify.clients[apiType] = config.compile(apiType)
            }

            logger.success('Finished shopify setup')
        }
    },
})
