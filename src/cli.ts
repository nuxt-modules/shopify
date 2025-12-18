#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'

const main = defineCommand({
    meta: {
        name: 'Nuxt Shopify',
        version: '1.0.0',
        description: 'Nuxt Shopify CLI',
    },

    subCommands: {
        init: () => import('./commands/init').then(r => r.default),
        webhooks: () => import('./commands/webhooks').then(r => r.default),
    },
})

runMain(main)
