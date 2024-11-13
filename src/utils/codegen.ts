import type { Nuxt } from '@nuxt/schema'
import type { ShopifyConfig } from '~/src/types'

import { type CodegenConfig, generate } from '@graphql-codegen/cli'
import { useLogger } from '@nuxt/kit'

export type UseCodegenParams = {
    nuxt: Nuxt
    config: ShopifyConfig
}

export async function useCodegen<T>({ nuxt, config }: UseCodegenParams): Promise<T> {
    const logger = useLogger('nuxt-shopify')

    return
}
