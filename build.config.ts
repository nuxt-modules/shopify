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
})
