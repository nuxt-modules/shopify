import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    tooling: true,
    typescript: {
      strict: true,
    },
    stylistic: true,
  },
}).override('nuxt/vue/rules', {
  rules: {
    'vue/multi-word-component-names': 'off',
  },
}).override('nuxt/typescript/rules', {
  rules: {
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  },
}).append({
  files: ['src/types/index.d.ts', 'src/clients/*.d.ts', 'test/unit/runtime/composables/async.test.ts'],
  rules: {
    '@typescript-eslint/consistent-type-definitions': 'off',
  },
})
