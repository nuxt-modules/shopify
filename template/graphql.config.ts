import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    schema: '.nuxt/schema/storefront.schema.json',
    documents: [
        'app/**/*.{graphql,gql,ts,js,vue}',
        'graphql/**/*.{graphql,gql,ts,js}',
        'server/**/*.{graphql,gql,ts,js}',
    ],
    generates: {
        '.nuxt/types/storefront/storefront.operations.d.ts': {
            plugins: [
                'typescript',
                'typescript-operations',
            ],
        },
    },
    config: {
        documentMode: 'string',
        gqlTagName: 'gql',
    },
}

export default config
