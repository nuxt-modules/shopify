import { join } from 'node:path'
import type { Nuxt } from '@nuxt/schema'
import type { ApiType, ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'
import { merge } from 'lodash'
import type { NuxtShopify } from '../types'

type FunctionParams = {
    nuxt: Nuxt
    apiType: ApiType
    options: NuxtShopify.ClientBaseOptions
}

export function getBaseConfig(params: FunctionParams): ShopifyApiTypesOptions {
    return {
        apiType: params.apiType,
        apiVersion: params.options.apiVersion,
        documents: [
            join(params.nuxt.options.srcDir, '**/*.{gql,graphql,ts,js}'),
            '!node_modules',
            '!dist',
            '!nuxt',
        ],
        outputDir: join(
            params.nuxt.options.buildDir,
            'types/shopify',
            params.apiType.toLowerCase(),
        ),
    }
}

export function getCodegenOption(params: FunctionParams) {
    if (params.options.codegen === false) {
        return undefined
    }

    if (params.options.codegen === true || params.options.codegen === undefined) {
        return getBaseConfig(params)
    }

    return merge(
        getBaseConfig(params),
        params.options.codegen,
    )
}
