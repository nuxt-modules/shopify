import type { CodegenHookParams } from '~/src/types'

import { generate } from '@graphql-codegen/cli'
import { useLogger } from '@nuxt/kit'
import { ApiType, shopifyApiTypes } from '@shopify/api-codegen-preset'
import defu from 'defu'
import { join } from 'node:path'

export const useCodegen = async (params: CodegenHookParams) => {
    const logger = useLogger('nuxt-shopify')

    const documents = {
        [ApiType.Storefront]: [
            '**/!(*.{admin,customer}).{gql,graphql}',
            '**/*.{ts,js}',
        ],
        [ApiType.Admin]: [
            '**/*.admin.{gql,graphql}',
        ],
        [ApiType.Customer]: [
            '**/*.customer.{gql,graphql}',
        ],
    }

    const apiTypeOptions = defu({
        documents: [
            '!node_modules',
            '!.nuxt',
            '!dist',
            ...documents[params.options.apiType],
        ],
        outputDir: join('.nuxt/types/shopify', params.options.apiType.toLowerCase()),
    }, params.options)

    return generate({
        cwd: params.nuxt.options.rootDir,
        generates: shopifyApiTypes(apiTypeOptions),
    })
        .then(() => logger.success(`Generated shopify API types for ${params.options.apiType}`))
        .catch(error => logger.error(`Failed to generate shopify API types for ${params.options.apiType}:\n${error.message}`))
}
