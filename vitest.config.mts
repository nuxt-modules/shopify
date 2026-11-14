import { fileURLToPath } from 'node:url'

import replace from '@rollup/plugin-replace'
import { defineConfig } from 'vitest/config'

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const hydrogenProductionBuild = fileURLToPath(import.meta.resolve('@shopify/hydrogen'))

export default defineConfig({
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'import.meta.dev': 'globalThis.__NUXT_DEV__',
        'import.meta.server': 'globalThis.__NUXT_SERVER__',
        'import.meta.client': 'globalThis.__NUXT_CLIENT__',
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '#imports', replacement: resolvePath('./test/helpers/stubs.ts') },
      { find: '#src', replacement: resolvePath('./src') },
      { find: '#test', replacement: resolvePath('./test') },
      { find: /^@shopify\/hydrogen$/, replacement: hydrogenProductionBuild },
    ],
  },
  test: {
    coverage: {
      include: [
        'src/**',
      ],
      exclude: [
        'src/clients',
        'src/commands',
        'src/types',
        'src/cli.ts',
      ],
    },
  },
})
