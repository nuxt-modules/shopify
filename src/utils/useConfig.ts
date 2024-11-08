import { join } from 'node:path'
import { ApiType, type ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'

import type {
    ModuleOptions,
    StorefrontOptions,
    AdminOptions,
} from '~/src/types'

export function useConfig(options: ModuleOptions) {
    const resolveClient = (apiType: ApiType): Partial<StorefrontOptions | AdminOptions> | undefined => {
        if (!options.clients) return

        switch (apiType) {
            case ApiType.Storefront:
                return options.clients.storefront
            case ApiType.Admin:
                return options.clients.admin
            default:
                return
        }
    }

    const getCodegen = (apiType: ApiType) => {
        const clientConfig = resolveClient(apiType)
        if (!clientConfig || clientConfig.codegen === false) return false

        return {
            apiType,
            apiVersion: clientConfig.apiVersion,
            documents: [
                `**/*.{gql,graphql,ts,js}`,
                '!node_modules',
                '!.nuxt',
                '!dist',
            ],
            outputDir: join('.nuxt/types/shopify', apiType.toLowerCase()),
        } satisfies ShopifyApiTypesOptions
    }

    const get = (apiType: ApiType) => {
        const clientConfig = resolveClient(apiType)
        if (!clientConfig) return

        const codegenOptions = getCodegen(apiType)

        return {
            ...clientConfig,
            ...(codegenOptions && { codegen: codegenOptions }),
        }
    }

    return {
        resolveClient,
        getCodegen,
        get,
    }
}
