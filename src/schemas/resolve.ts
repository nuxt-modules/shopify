import type { Nuxt } from '@nuxt/schema'
import type { z } from 'zod'

import type { configObjectSchema } from './config'

import { ShopifyClientType } from './config'
import { createStoreDomain } from '../runtime/utils/clients/transport'
import { isInstalled } from '../utils/install'
import { useLogger } from '../utils/log'
import { SESSION_PASSWORD_ENV, generateSessionPassword, persistSessionPassword } from '../utils/session'

type ShopifyConfig = z.output<typeof configObjectSchema>

const HYDROGEN = '@shopify/hydrogen'
const HYDROGEN_REACT = '@shopify/hydrogen-react'

const proxyableClients = [ShopifyClientType.Storefront, ShopifyClientType.CustomerAccount] as const

function resolveRequirements(config: ShopifyConfig) {
  const logger = useLogger()

  if (config.clients[ShopifyClientType.CustomerAccount] && !isInstalled(HYDROGEN)) {
    logger.error(`The customer account client is configured but \`${HYDROGEN}\` is not installed. Install it (e.g. \`npm i ${HYDROGEN}\`) or remove \`shopify.clients.customerAccount\`. Disabling customer account client.`)

    config.clients[ShopifyClientType.CustomerAccount] = undefined
  }

  if (config.analytics && !isInstalled(HYDROGEN_REACT)) {
    logger.error(`Analytics is enabled but \`${HYDROGEN_REACT}\` is not installed. Install it (e.g. \`npm i ${HYDROGEN_REACT}\`) or disable \`shopify.analytics\`. Disabling analytics.`)

    config.analytics = false
  }

  if (
    config.analytics
    && !config.clients[ShopifyClientType.Storefront]?.publicAccessToken
    && !config.analytics.consent?.storefrontAccessToken
  ) {
    logger.error('Analytics is enabled but no public storefront access token is set. Set `clients.storefront.publicAccessToken` or `analytics.consent.storefrontAccessToken`. Disabling analytics.')

    config.analytics = false
  }
}

function resolveProxies(config: ShopifyConfig, nuxt: Nuxt) {
  if (nuxt.options.ssr && !(nuxt.options as { _generate?: boolean })._generate) return

  const logger = useLogger()

  for (const clientType of proxyableClients) {
    const client = config.clients[clientType]

    if (!client?.proxy) continue

    logger.info(`Disabling the ${clientType} proxy: server-side request proxying requires SSR. Requests are sent to Shopify directly.`)

    client.proxy = false
  }
}

async function resolveCustomerAccountApiUrl(config: ShopifyConfig) {
  const customerAccount = config.clients[ShopifyClientType.CustomerAccount]

  if (!customerAccount) return

  const logger = useLogger()

  if (customerAccount.apiUrl) {
    logger.debug(`Using the configured customer account API URL: ${customerAccount.apiUrl}`)

    return
  }

  const wellKnownURL = createStoreDomain(config.name) + '/.well-known/customer-account-api'

  const apiUrl = await fetch(wellKnownURL)
    .then(async res => (await res.json() as { graphql_api: string }).graphql_api)
    .catch(() => undefined)

  if (apiUrl) {
    logger.debug(`Resolved customer account API URL: ${apiUrl}`)
  }
  else {
    logger.warn(
      `Could not resolve the customer account API URL from \`${wellKnownURL}\` - `
      + 'customer account requests will fail (is the Customer Account API enabled for your store?, '
      + 'or set `clients.customerAccount.apiUrl` explicitly)',
    )
  }

  customerAccount.apiUrl = apiUrl
}

async function resolveSessionPassword(config: ShopifyConfig, nuxt: Nuxt) {
  const session = config.clients[ShopifyClientType.CustomerAccount]?.session

  if (!session || session.password) return

  const logger = useLogger()
  const envPassword = process.env[SESSION_PASSWORD_ENV]

  if (envPassword) {
    session.password = envPassword

    return
  }

  if (!nuxt.options.dev) {
    logger.warn(`No customer account session password set - customer account sessions will fail until the \`${SESSION_PASSWORD_ENV}\` environment variable is set`)

    return
  }

  session.password = generateSessionPassword()

  await persistSessionPassword(nuxt.options.rootDir, session.password)

  logger.info('Generated a customer account session password in `.env`')
}

export async function resolveConfig(config: ShopifyConfig, nuxt?: Nuxt): Promise<ShopifyConfig> {
  if (!nuxt) return config

  resolveRequirements(config)
  resolveProxies(config, nuxt)

  await resolveCustomerAccountApiUrl(config)
  await resolveSessionPassword(config, nuxt)

  return config
}
