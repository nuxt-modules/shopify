import type { Nuxt } from '@nuxt/schema'

import type { ShopifyConfig } from '../types'

import { getCurrentSupportedApiVersions } from '@shopify/graphql-client'
import { kebabCase } from 'scule'

import { ShopifyClientType, publicConfigSchema } from '../runtime/utils/config'
import { resolveShopId } from '../runtime/utils/clients/customer-account/discovery'
import { useLogger } from '../utils/log'
import { SESSION_PASSWORD_ENV, SESSION_PASSWORD_MIN_LENGTH, isUsableSessionPassword } from '../runtime/utils/session'
import { generateSessionPassword, persistSessionPassword } from '../utils/session'

function findUnrecognizedOptions(input: unknown, output: unknown, path: string[] = []): string[] {
  if (!input || !output || input === output || typeof input !== 'object' || typeof output !== 'object') return []

  return Object.entries(input).flatMap(([key, value]) => value === undefined || key in output
    ? findUnrecognizedOptions(value, (output as Record<string, unknown>)[key], [...path, key])
    : [[...path, key].join('.')])
}

export const CONFIGURATION_DOCS_URL = 'https://shopify.nuxtjs.org/essentials/configuration'

export function warnUnrecognizedOptions(input: unknown, config: ShopifyConfig) {
  for (const option of findUnrecognizedOptions(input, config)) {
    useLogger().warn(`Unrecognized configuration value \`shopify.${option}\` is ignored. See ${CONFIGURATION_DOCS_URL}`)
  }
}

export function warnPublicOptions(publicInput: unknown, config: ShopifyConfig) {
  const unrecognized = new Set(findUnrecognizedOptions(publicInput, config))

  for (const option of findUnrecognizedOptions(publicInput, publicConfigSchema.parse(config))) {
    if (!unrecognized.has(option)) {
      useLogger().warn(`\`runtimeConfig.public.shopify.${option}\` is sent to the browser. Move it to \`runtimeConfig.shopify\``)
    }
  }
}

function warnCustomerAccountProxyOptOut(config: ShopifyConfig) {
  if (config.clients[ShopifyClientType.CustomerAccount]?.proxy === false) {
    useLogger().warn('The customer account proxy is disabled, so `useCustomerAccount()` cannot authenticate from the browser. Remove `clients.customerAccount.proxy: false`, or only call the client on the server')
  }
}

function warnNonRootBaseURL(config: ShopifyConfig, nuxt: Nuxt) {
  const { baseURL } = nuxt.options.app

  if (baseURL === '/' || !(config.clients.storefront || config.clients.customerAccount || config.analytics)) return

  useLogger().warn(`\`app.baseURL\` is \`${baseURL}\`, but Hydrogen serves Shopify's routes, such as the Storefront API proxy, \`/api/cart\` and \`/account/*\`, only from the domain root, so they won't work. Serve the app from \`/\``)
}

function warnUnsupportedApiVersions(config: ShopifyConfig) {
  const logger = useLogger()

  for (const clientType of Object.values(ShopifyClientType)) {
    const client = config.clients[clientType]

    if (!client || getCurrentSupportedApiVersions().includes(client.apiVersion)) continue

    logger.warn(
      `The ${kebabCase(clientType)} client uses API version \`${client.apiVersion}\`, `
      + `outside the window Shopify supports (${getCurrentSupportedApiVersions().join(', ')})`,
    )
  }
}

async function resolveSessionPassword(config: ShopifyConfig, nuxt: Nuxt) {
  const session = config.clients[ShopifyClientType.CustomerAccount]?.session

  if (!session) return

  const logger = useLogger()
  const environmentPassword = globalThis.process.env[SESSION_PASSWORD_ENV]
  const candidates = [session.password, environmentPassword]
  const password = candidates.find(isUsableSessionPassword)

  if (password && (nuxt.options.dev || password !== environmentPassword)) {
    session.password = password

    return
  }

  delete session.password

  if (password || nuxt.options._prepare) return

  if (!nuxt.options.dev) {
    logger.warn(candidates.some(Boolean)
      ? `The customer account session password must be a random secret of at least ${SESSION_PASSWORD_MIN_LENGTH} characters: set one in \`${SESSION_PASSWORD_ENV}\` or customer sign-in will fail`
      : `No customer account session password set at build time: set \`${SESSION_PASSWORD_ENV}\` in the deployment environment or customer sign-in will fail`)

    return
  }

  session.password = generateSessionPassword()

  if (await persistSessionPassword(nuxt.options.rootDir, session.password)) {
    logger.info('Generated a customer account session password in `.env`')
  }
  else {
    logger.warn(`Generated a customer account session password for this run only: \`.env\` sets \`${SESSION_PASSWORD_ENV}\`, but it isn't loaded`)
  }
}

export async function resolveConfig(config: ShopifyConfig, nuxt: Nuxt): Promise<ShopifyConfig> {
  warnCustomerAccountProxyOptOut(config)
  warnNonRootBaseURL(config, nuxt)
  warnUnsupportedApiVersions(config)

  const resolved = await resolveShopId(config, undefined, useLogger())

  await resolveSessionPassword(resolved, nuxt)

  return resolved
}
