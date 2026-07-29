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

  externals: [
    '@shopify/hydrogen',
  ],
})
