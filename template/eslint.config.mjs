import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    typescript: {
      strict: true,
    },
    stylistic: true,
  },
})
