import { generate } from '@graphql-codegen/cli'
import { defineNuxtModule } from '@nuxt/kit'
import { ApiType, shopifyApiTypes } from '@shopify/api-codegen-preset'
import type { NuxtShopify } from './types'

import { setupApi } from './utils/setupApi'

export default defineNuxtModule<NuxtShopify.ModuleOptions>({
    meta: {
        name: '@marlz/nuxt-shopify',
        configKey: 'shopify',
        compatibility: {
            nuxt: '>=3.13.0',
        },
    },

    hooks: {
        'shopify:prepare': async ({ nuxt, codegenOptions }) => {
            if (codegenOptions) {
                await nuxt.callHook(
                    'shopify:codegen', {
                        nuxt,
                        codegenOptions,
                    },
                )
            }
        },
        'shopify:codegen': async ({ codegenOptions }) => {
            await generate({
                generates: shopifyApiTypes(codegenOptions),
            })
        },
        'prepare:types': async (types) => {

        },
    },

    async setup(options, nuxt) {
        if (!options) {
            console.warn('No shopify module configuration provided.')
            console.warn('> skipping shopify setup...')

            return
        }

        await setupApi({ nuxt, apiType: ApiType.Storefront, options })
            .then(async ({ options, codegenOptions }) => {
                await nuxt.callHook('shopify:prepare', {
                    nuxt,
                    options,
                    codegenOptions,
                })
            })

        await setupApi({ nuxt, apiType: ApiType.Admin, options })
            .then(async ({ options, codegenOptions }) => {
                await nuxt.callHook('shopify:prepare', {
                    nuxt,
                    options,
                    codegenOptions,
                })
            })
    },
})
