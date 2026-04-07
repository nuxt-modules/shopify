import { defineConfig } from 'vitest/config'

export default defineConfig({
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
