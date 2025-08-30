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

    replace: {
        ROLLUP_REPLACE_VIRTUAL_MODULES: 'false',
    },
})
