import type { CodegenHookParams } from '~/src/types'

import { generate } from '@graphql-codegen/cli'
import { useLogger } from '@nuxt/kit'
import { ApiType, shopifyApiTypes } from '@shopify/api-codegen-preset'
import defu from 'defu'
import { join } from 'node:path'

export function getDefaultOptions(apiType: ApiType) {
    const documents = [
        '!node_modules',
        '!.nuxt',
        '!dist',
        `**/*.${apiType.toLowerCase()}.{gql,graphql}`,
    ]

    // @TODO: improve customizability
    if (apiType === ApiType.Storefront) {
        documents.push(...[
            '**/!(*.{admin,customer}).{gql,graphql}',
            '**/*.{ts,js}',
        ])
    }

    return {
        documents,
        outputDir: join('.nuxt/types/shopify', apiType.toLowerCase()),
    }
}

export async function useCodegen(params: CodegenHookParams) {
    const logger = useLogger('nuxt-shopify')

    return generate({
        cwd: params.nuxt.options.rootDir,
        generates: shopifyApiTypes(defu(
            getDefaultOptions(params.options.apiType),
            params.options,
        )),
    })
        .then(() => logger.success(`Generated shopify API types for ${params.options.apiType}`))
        .catch(error => logger.error(`Failed to generate shopify API types for ${params.options.apiType}:\n${error.message}`))
}
