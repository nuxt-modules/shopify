import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,
    entries: [
        'src/commands/init',
    ],
    externals: [
        '@shopify/admin-api-client',
        '@shopify/storefront-api-client',
        '@shopify/graphql-client',
    ],
})
