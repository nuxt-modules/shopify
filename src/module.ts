import { generate } from '@graphql-codegen/cli'
import { addServerImportsDir, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { ApiType } from '@shopify/api-codegen-preset'
import { shopifyApiTypes } from '@shopify/api-codegen-preset'
import defu from 'defu'

import type { ModuleOptions } from './types'

import { useConfig } from './utils/useConfig'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: '@konkonam/nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.11.0',
        },
    },

    hooks: {
        'shopify:codegen': async (nuxt, codegenOptions) => {
            await generate({
                cwd: nuxt.options.rootDir,
                generates: shopifyApiTypes(codegenOptions),
            })
        },
    },

    async setup(options, nuxt) {
        if (!options?.clients) {
            console.warn('No shopify module configuration provided.')
            console.warn('> skipping shopify setup...')
        }
        else {
            const resolver = createResolver(import.meta.url)
            const availableApiTypes = Object.keys(options.clients) as ApiType[]
            const config = useConfig(options)

            for (const apiType of availableApiTypes) {
                const codegenOptions = config.getCodegen(apiType)
                if (codegenOptions) {
                    await nuxt.callHook('shopify:codegen', nuxt, codegenOptions)
                }

                addServerImportsDir(
                    resolver.resolve('./runtime/server/imports'),
                )

                nuxt.options.runtimeConfig._shopify = defu(
                    nuxt.options.runtimeConfig._shopify ?? {},
                    {
                        clients: {
                            [apiType]: config.get(apiType),
                        },
                    },
                )
            }
        }
    },
})
