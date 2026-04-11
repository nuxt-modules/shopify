import type { Nuxt } from '@nuxt/schema'
import type { ConsolaInstance } from 'consola'

import { stat } from 'node:fs/promises'
import { addTypeTemplate, createResolver } from '@nuxt/kit'
import defu from 'defu'

import { nuxtAuthUtilsDevTemplate, nuxtAuthUtilsTemplate } from '../templates/auth-utils'

export default async function setupDevMode(nuxt: Nuxt, logger: ConsolaInstance) {
  const resolver = createResolver(import.meta.url)

  const sourceFiles = {
    storefront: resolver.resolve('../../src/clients/storefront.d.ts'),
    customerAccount: resolver.resolve('../../src/clients/customer-account.d.ts'),
    admin: resolver.resolve('../../src/clients/admin.d.ts'),
    types: resolver.resolve('../../src/types/index.d.ts'),
  }

  const sourceFilesExist = await Promise.all([
    stat(sourceFiles.storefront).catch(() => false),
    stat(sourceFiles.customerAccount).catch(() => false),
    stat(sourceFiles.admin).catch(() => false),
  ]).then(results => results.every(result => result !== false))

  if (sourceFilesExist) {
    logger.info('Source files detected, enabling module aliases for development mode.')

    nuxt.options = defu(nuxt.options, {
      alias: {
        '@nuxtjs/shopify/storefront': sourceFiles.storefront,
        '@nuxtjs/shopify/customer-account': sourceFiles.customerAccount,
        '@nuxtjs/shopify/admin': sourceFiles.admin,
      },

      typescript: {
        tsConfig: {
          include: [
            sourceFiles.types,
          ],
        },
      },

      nitro: {
        typescript: {
          tsConfig: {
            include: [
              sourceFiles.storefront,
              sourceFiles.customerAccount,
              sourceFiles.admin,
            ],
          },
        },
      },
    })

    addTypeTemplate({
      filename: 'shopify/auth-utils.d.ts',
      getContents: () => nuxtAuthUtilsTemplate,
    }, {
      nuxt: true,
      nitro: true,
    })

    addTypeTemplate({
      filename: 'shopify/auth-utils.dev.d.ts',
      getContents: () => nuxtAuthUtilsDevTemplate,
    })
  }
}
