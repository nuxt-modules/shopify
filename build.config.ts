import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,

    entries: [
        'src/module',
        'src/commands/init',

        {
            builder: 'mkdist',
            input: 'src/types/clients',
        },
    ],

    replace: {
        'process.env.NUXT_SHOPIFY_DEV_MODULE_ALIAS': 'false',
    },
})
