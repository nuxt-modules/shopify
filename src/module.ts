import type { ApiType } from '@shopify/api-codegen-preset'
import { generate } from '@graphql-codegen/cli'
import { addServerImportsDir, createResolver, useLogger, defineNuxtModule } from '@nuxt/kit'
import { shopifyApiTypes } from '@shopify/api-codegen-preset'

import pkg from '../package.json'
import type { ModuleOptions } from './types'
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
            const logger = useLogger('nuxt-shopify', {
                level: 1,
            })

            await generate({
                cwd: nuxt.options.rootDir,
                generates: shopifyApiTypes(codegenOptions),
            }).catch((error) => {
                console.error(error)
            })
        },
    },

    async setup(options, nuxt) {
        if (!options?.clients) {
            console.warn('No shopify module configuration provided.')
            console.warn('> skipping shopify setup...')
        }
        else {
            const logger = useLogger(pkg.name, {
                level: 1,
            })

            logger.info('shopify module setup', {
                level: 'info',
            })

            const resolver = createResolver(import.meta.url)
            const availableApiTypes = Object.keys(options.clients)

            const capitalize = (s: string) => (s && String(s[0]).toUpperCase() + String(s).slice(1))

            const config = useConfig(options)

            nuxt.options.runtimeConfig._shopify = {
                name: options.name,
                debug: options.debug,
                clients: {},
            }

            for (const apiType of availableApiTypes) {
                const apiTypeCapitalized = capitalize(apiType) as ApiType
                const codegenOptions = config.getCodegen(apiTypeCapitalized)
                if (codegenOptions) {
                    await nuxt.callHook('shopify:codegen', nuxt, codegenOptions)
                }

                addServerImportsDir(
                    resolver.resolve('./runtime/server/utils'),
                )

                // @ts-expect-error - union loss due to copy
                nuxt.options.runtimeConfig._shopify.clients[apiType] = config.compile(apiType)
            }
        }
    },
})
