import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['./dev'],

  alias: {
    '#src': fileURLToPath(new URL('./src', import.meta.url)),
    '#test': fileURLToPath(new URL('./test', import.meta.url)),
  },
})
