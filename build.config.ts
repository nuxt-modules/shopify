import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,
    entries: [
        'src/commands/init',
    ],
    externals: [
        '@shopify/graphql-client',
    ],
})
