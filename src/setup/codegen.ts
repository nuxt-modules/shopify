import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { useLogger } from '../utils/log'
import { getConfiguredClients } from '../utils/clients'
import { clearGenerateFailures, getGenerateFailures } from '../utils/codegen'
import { registerTemplates } from '../utils/templates'

function failBuildOnGenerateErrors(nuxt: Nuxt) {
  if (nuxt.options.dev || nuxt.options._prepare) return

  clearGenerateFailures()

  nuxt.hook('build:before', () => {
    const failures = getGenerateFailures()

    if (!failures.length) return

    throw new Error(
      `[shopify] Type generation failed:\n${failures.map(failure => `  - ${failure}`).join('\n')}`,
    )
  })
}

export default function setupCodegen(nuxt: Nuxt, config: ShopifyConfig) {
  const logger = useLogger()
  const clients = getConfiguredClients(config)

  for (const clientType of clients) {
    const clientConfig = config.clients[clientType]

    if (!clientConfig) continue

    if (!clientConfig.codegen) {
      logger.info(`Skipping type generation for ${clientType}: \`codegen\` is disabled`)
      continue
    }

    logger.debug(`Setting up code generation for ${clientType}`)

    registerTemplates(nuxt, config, clientType)
  }

  failBuildOnGenerateErrors(nuxt)
}
