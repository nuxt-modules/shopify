import { stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineBuildConfig } from 'unbuild'

import { version } from './package.json'

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

  hooks: {
    'build:done': async (ctx) => {
      if (ctx.options.stub) return

      const file = resolve(ctx.options.outDir, 'runtime/utils/version.js')

      const exists = await stat(file).then(() => true).catch(() => false)

      if (!exists) return

      const content = `export const MODULE_VERSION = ${JSON.stringify(version)};\n`

      await writeFile(file, content, 'utf8')
    },
  },
})
