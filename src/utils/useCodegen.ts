import type { ShopifyApiTypesOptions } from '@shopify/api-codegen-preset'

import { generate } from '@graphql-codegen/cli'
import defu from 'defu'

export const useCodegen = (input: ShopifyApiTypesOptions) => {
    const result = defu(
        {
            generates: input,
            silent: true,
            ignoreNoDocuments: true,
        },
        {
            generates: input,
        },
    )

    return generate(
        result,
    )
}
