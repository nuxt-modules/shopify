import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    tooling: true,
    typescript: {
      strict: true,
    },
    stylistic: true,
  },
})
