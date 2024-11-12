import type { ModuleOptions, ApiTypeToOptions, ApiTypeToResolvedOptions } from '~/src/types'

import { ApiType } from '@shopify/api-codegen-preset'

export function resolveClient<T extends ApiType>(options: ModuleOptions, apiType: T): ApiTypeToOptions[T] | undefined {
    if (!options.clients) return

    switch (apiType) {
        case ApiType.Storefront:
            return options.clients.storefront as ApiTypeToOptions[T]
        case ApiType.Admin:
            return options.clients.admin as ApiTypeToOptions[T]
        default:
            return
    }
}

export function useConfig<T extends ApiType>(options: ModuleOptions, apiType: T) {
    console.log(options)

    const clientConfig = resolveClient(options, apiType)
    if (!clientConfig) return

    clientConfig.storeDomain = `https://${options.name}.myshopify.com/api/${clientConfig.apiVersion}/graphql.json`

    console.log(clientConfig)

    return clientConfig as unknown as ApiTypeToResolvedOptions[T]
}
