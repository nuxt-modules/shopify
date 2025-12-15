import { defineCommand, runMain } from 'citty'

const main = defineCommand({
    meta: {
        name: 'Nuxt Shopify',
        version: '1.0.0',
        description: 'Nuxt Shopify CLI',
    },

    subCommands: {
        init: () => import('./init').then(r => r.default),
        webhooks: () => import('./webhooks').then(r => r.default),
    },
})

runMain(main)
