import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  define: {
    'import.meta.dev': 'globalThis.__NUXT_DEV__',
  },
  resolve: {
    alias: {
      '#imports': resolvePath('./test/helpers/stubs.ts'),
      '#src': resolvePath('./src'),
      '#test': resolvePath('./test'),
    },
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
