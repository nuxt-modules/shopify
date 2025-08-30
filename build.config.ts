import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,
    entries: [
        'src/commands/init',

        {
            builder: 'mkdist',
            input: 'src/types/clients',
        },
    ],
    externals: [
        '@shopify/graphql-client',
    ],
})
