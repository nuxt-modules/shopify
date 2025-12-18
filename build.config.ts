import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,

    entries: [
        'src/module',
        'src/cli',

        {
            builder: 'mkdist',
            input: 'src/clients',
            outDir: 'dist/clients',
        },
    ],

    replace: {
        'await setupDevMode(nuxt, logger)': '',
    },
})
