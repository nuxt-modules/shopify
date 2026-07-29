import { fileURLToPath } from 'node:url'

const alias = {
  '@nuxtjs/shopify/storefront': fileURLToPath(new URL('../src/clients/storefront.d.ts', import.meta.url)),
  '@nuxtjs/shopify/customer-account': fileURLToPath(new URL('../src/clients/customer-account.d.ts', import.meta.url)),
  '@nuxtjs/shopify/admin': fileURLToPath(new URL('../src/clients/admin.d.ts', import.meta.url)),
}

const moduleTypes = fileURLToPath(new URL('../src/types/index.d.ts', import.meta.url))

export default defineNuxtConfig({
  alias,

  nitro: {
    typescript: {
      tsConfig: {
        include: [moduleTypes],
      },
    },
  },

  typescript: {
    tsConfig: {
      include: [moduleTypes],
    },
  },

  hooks: {
    'prepare:types'({ nodeTsConfig }) {
      if (!nodeTsConfig) return

      nodeTsConfig.compilerOptions ||= {}
      nodeTsConfig.compilerOptions.paths ||= {}

      for (const [name, path] of Object.entries(alias)) {
        nodeTsConfig.compilerOptions.paths[name] = [path]
      }

      nodeTsConfig.include ||= []
      nodeTsConfig.include.push(moduleTypes)
    },
  },
})
