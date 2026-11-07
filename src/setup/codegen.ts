import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { kebabCase } from 'scule'

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
      `[shopify] Type generation failed:\n${failures.map(failure => `  - ${failure}`).join('\n')}\n`
      + 'To build without generating types, for example without network access or credentials in CI, set `codegen: false` on the client',
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
      logger.info(`Skipping type generation for the ${kebabCase(clientType)} client: \`codegen\` is disabled`)
      continue
    }

    logger.debug(`Setting up code generation for the ${kebabCase(clientType)} client`)

    registerTemplates(nuxt, config, clientType)
  }

  failBuildOnGenerateErrors(nuxt)
}
