import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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

    const configPath = join(template.dir, 'nuxt.config.ts')

    if (!await access(configPath).then(() => true).catch(() => false)) {
      log.error('Failed to prepare template contents.')
      return
    }

    const configContent = await readFile(configPath, 'utf-8')
      .then(data => data.replace(/\n\s*extends: \['\.\.\/dev'\],\n\n?/, '\n'))
      .then(data => data.replace('../src/module', '@nuxtjs/shopify'))

    await writeFile(
      configPath,
      configContent,
      'utf-8',
    )

    const packagePath = join(template.dir, 'package.json')

    const packageContent = await readFile(packagePath, 'utf-8').catch(() => undefined)

    if (packageContent) {
      await writeFile(
        packagePath,
        packageContent.replace(/("@nuxtjs\/shopify":\s*)"latest"/, `$1"^${MODULE_VERSION}"`),
        'utf-8',
      )
    }

    log.success(`Nuxt Shopify Template initialized in ${template.dir}`)
  },
})
