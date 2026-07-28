import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#imports': fileURLToPath(new URL('./test/helpers/stubs.ts', import.meta.url)),
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
