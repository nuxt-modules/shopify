import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineCommand } from 'citty'
import log from 'consola'
import { downloadTemplate } from 'giget'

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
        const template = await downloadTemplate('gh:nuxt-modules/shopify/template', {
            dir: args.directory ?? '.',
        }).catch((error) => {
            log.error('Failed to download template:', error)
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
            .then(data => data.replace('../src/module', '@nuxtjs/shopify'))

        await writeFile(
            configPath,
            configContent,
            'utf-8',
        )

        log.success(`Nuxt Shopify Template initialized in ${template.dir}`)
    },
})
