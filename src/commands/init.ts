#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'
import log from 'consola'
import { downloadTemplate } from 'giget'

const command = defineCommand({
    meta: {
        name: 'init',
        description: 'Create a new Nuxt Shopify template project',
    },

    args: {
        directory: {
            type: 'positional',
            description: 'Directory to initialize the project template into.',
            required: true,
        },
    },

    run: async ({ args }) => {
        const template = await downloadTemplate('gh:konkonam/nuxt-shopify/template', {
            dir: args.directory,
        }).catch((error) => {
            log.error('Failed to download template:', error)
        })

        if (!template) return

        log.success(`Template initialized in ${template.dir}`)
    },
})

runMain(command)
