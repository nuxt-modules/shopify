import { defineCommand } from 'citty'
import log from 'consola'
import { downloadTemplate } from 'giget'

import { MODULE_VERSION } from '../runtime/utils/version'

const REPOSITORY = 'gh:nuxt-modules/shopify/template'

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Create a new Nuxt Shopify template project',
  },

  args: {
    directory: {
      type: 'positional',
      description: 'Directory to initialize the project template into.',
      required: false,
    },
  },

  run: async ({ args }) => {
    const dir = args.directory ?? '.'

    const template = await downloadTemplate(`${REPOSITORY}#v${MODULE_VERSION}`, { dir })
      .catch(async (error) => {
        log.warn(`Could not download the template for v${MODULE_VERSION} (${error}), falling back to the latest template.`)

        return await downloadTemplate(REPOSITORY, { dir })
          .catch((fallbackError) => {
            log.error('Failed to download template:', fallbackError)
          })
      })

    if (!template) {
      log.error('Failed to download template.')
      return
    }

    log.success(`Nuxt Shopify Template initialized in ${template.dir}`)
  },
})
