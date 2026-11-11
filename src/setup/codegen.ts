import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'
import type { CodegenClient } from '../utils/codegen'

import { addTypeTemplate } from '@nuxt/kit'
import { basename } from 'pathe'
import { kebabCase } from 'scule'

import { getConfiguredClients } from '../utils/clients'
import {
  OUTPUT_DIR,
  createOperationsGenerator,
  createSchemaLoader,
  createTypesGenerator,
  getGenerateFailures,
} from '../utils/codegen'
import { useLogger } from '../utils/log'

function registerTemplates(nuxt: Nuxt, client: CodegenClient) {
  const name = kebabCase(client.clientType)
  const dir = `${OUTPUT_DIR}/${name}`
  const loadSchema = createSchemaLoader(nuxt, client)
  const context = { nuxt: true, nitro: true, node: true }

  const types = `${dir}/${name}.types.d.ts` as const
  const operations = `${dir}/${name}.operations.d.ts` as const

  addTypeTemplate({ filename: types, getContents: createTypesGenerator(nuxt, client, types, loadSchema) }, context)
  addTypeTemplate({ filename: operations, getContents: createOperationsGenerator(nuxt, client, operations, loadSchema) }, context)

  addTypeTemplate({
    filename: `${dir}/index.d.ts`,
    getContents: () => `export * from './${basename(types)}'\nexport * from './${basename(operations)}'\n`,
  }, context)

  nuxt.options.alias[`#shopify/${name}`] ??= `./${dir}`
}

function failBuildOnGenerateFailures(nuxt: Nuxt) {
  if (nuxt.options.dev || nuxt.options._prepare || nuxt.options.test) return

  nuxt.hook('build:before', () => {
    const failures = getGenerateFailures(nuxt)

    if (!failures.length) return

    throw new Error(
      `[shopify] Type generation failed:\n${failures.map(failure => `  - ${failure}`).join('\n')}\n`
      + 'To build without generating types, for example without network access or credentials in CI, set `codegen: false` on the client',
    )
  })
}

export default function setupCodegen(nuxt: Nuxt, config: ShopifyConfig) {
  const logger = useLogger()

  for (const client of getConfiguredClients(config)) {
    if (!client.clientConfig.codegen) {
      logger.info(`Skipping type generation for the ${kebabCase(client.clientType)} client: \`codegen\` is disabled`)
      continue
    }

    logger.debug(`Setting up code generation for the ${kebabCase(client.clientType)} client`)

    registerTemplates(nuxt, { ...client, shopName: config.name })
  }

  failBuildOnGenerateFailures(nuxt)
}
