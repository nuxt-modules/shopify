import type { Nuxt } from '@nuxt/schema'
import type { z } from 'zod'

import type { configObjectSchema } from '../runtime/utils/config'

import { getCurrentSupportedApiVersions } from '@shopify/graphql-client'
import { kebabCase } from 'scule'

import { ShopifyClientType } from '../runtime/utils/config'
import { isSupportedApiVersion } from '../runtime/utils/clients/defaults'
import { createStoreDomain } from '../runtime/utils/clients/transport'
import { getCustomerAccountApiUrl } from '../runtime/utils/clients/customer-account/auth'
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
    logger.warn(`The customer account client is configured but \`${HYDROGEN}\` is not installed. Install it (e.g. \`npm i ${HYDROGEN}\`) or remove \`shopify.clients.customerAccount\`. Disabling customer account client.`)

    config.clients[ShopifyClientType.CustomerAccount] = undefined
  }

  if (config.analytics && !isInstalled(HYDROGEN_REACT)) {
    logger.warn(`Analytics is enabled but \`${HYDROGEN_REACT}\` is not installed. Install it (e.g. \`npm i ${HYDROGEN_REACT}\`) or disable \`shopify.analytics\`. Disabling analytics.`)

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

function warnUnsupportedApiVersions(config: ShopifyConfig) {
  const logger = useLogger()

  for (const clientType of Object.values(ShopifyClientType)) {
    const client = config.clients[clientType]

    if (!client || isSupportedApiVersion(client.apiVersion)) continue

    logger.warn(
      `The ${kebabCase(clientType)} client is using API version \`${client.apiVersion}\`, which is outside the window Shopify supports `
      + `(${getCurrentSupportedApiVersions().join(', ')}).`,
    )
  }
}

function resolveProxies(config: ShopifyConfig, nuxt: Nuxt) {
  if (!(nuxt.options as { _generate?: boolean })._generate) return

  const logger = useLogger()

  for (const clientType of proxyableClients) {
    const client = config.clients[clientType]

    if (!client?.proxy) continue

    if (clientType === ShopifyClientType.CustomerAccount) {
      logger.warn('Disabling the customer account proxy: static generation has no server to proxy through. The customer account client cannot authenticate browser requests without the proxy, so prerendered pages must not call it')
    }
    else {
      logger.info(`Disabling the ${clientType} proxy: static generation has no server to proxy through, requests are sent to Shopify directly`)
    }

    client.proxy = false
  }
}

async function resolveCustomerAccountApiUrl(config: ShopifyConfig) {
  const customerAccount = config.clients[ShopifyClientType.CustomerAccount]

  if (!customerAccount) return

  const logger = useLogger()

  if (customerAccount.apiURL) {
    logger.debug(`Using the configured customer account API URL: ${customerAccount.apiURL}`)

    return
  }

  const storeDomain = createStoreDomain(config.name)

  const apiUrl = await getCustomerAccountApiUrl(storeDomain, customerAccount.apiVersion)

  if (apiUrl) {
    customerAccount.apiURL = apiUrl

    logger.debug(`Resolved customer account API URL: ${customerAccount.apiURL}`)

    return
  }

  logger.warn(
    `Could not resolve the customer account API URL from \`${storeDomain}/.well-known/customer-account-api\` - `
    + 'customer account requests will fail (is the Customer Account API enabled for your store?, '
    + 'or set `clients.customerAccount.apiURL` explicitly)',
  )
}

async function resolveSessionPassword(config: ShopifyConfig, nuxt: Nuxt) {
  const session = config.clients[ShopifyClientType.CustomerAccount]?.session

  if (!session || session.password) return

  const logger = useLogger()
  const envPassword = globalThis.process.env[SESSION_PASSWORD_ENV]

  if (envPassword) {
    session.password = envPassword

    return
  }

  if (!nuxt.options.dev) {
    logger.warn(`No customer account session password set at build time: set \`${SESSION_PASSWORD_ENV}\` in the deployment environment or customer account sessions will fail`)

    return
  }

  session.password = generateSessionPassword()

  await persistSessionPassword(nuxt.options.rootDir, session.password)

  logger.info('Generated a customer account session password in `.env`')
}

export async function resolveConfig(config: ShopifyConfig, nuxt?: Nuxt): Promise<ShopifyConfig> {
  if (!nuxt) return config

  resolveRequirements(config)
  warnUnsupportedApiVersions(config)
  resolveProxies(config, nuxt)

  await resolveCustomerAccountApiUrl(config)
  await resolveSessionPassword(config, nuxt)

  return config
}
