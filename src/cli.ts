#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'

import { MODULE_VERSION } from './runtime/utils/version'

const main = defineCommand({
  meta: {
    name: 'nuxt-shopify',
    version: MODULE_VERSION,
    description: 'Nuxt Shopify CLI',
  },

  subCommands: {
    webhooks: () => import('./commands/webhooks').then(r => r.default),
  },
})

runMain(main)
