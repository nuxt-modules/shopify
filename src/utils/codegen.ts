import type { Nuxt } from '@nuxt/schema'
import type { ShopifyConfig } from '~/src/types'

import { type CodegenConfig, generate } from '@graphql-codegen/cli'
import { useLogger } from '@nuxt/kit'
import { shopifyApiTypes } from '@shopify/api-codegen-preset'

export type UseCodegenParams = {
    nuxt: Nuxt
    config: ShopifyConfig
}

export async function useCodegen({ nuxt, config }: UseCodegenParams) {
    const logger = useLogger('nuxt-shopify')

    const generates = {
        ...(config.clients?.storefront?.codegen && shopifyApiTypes(config.clients.storefront.codegen)),
        ...(config.clients?.admin?.codegen && shopifyApiTypes(config.clients.admin.codegen)),
    } satisfies CodegenConfig['generates']

    await nuxt.callHook('shopify:codegen:resolved', { nuxt, generates })

    return generate({ cwd: nuxt.options.rootDir, generates })
        .then(() => logger.success('Generated shopify API types!'))
        .catch(error => logger.error(`Failed to generate shopify API types:\n${error.message}`))
}
