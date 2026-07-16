import type { PublicShopifyConfig, ShopifyConfig } from '../schemas'

import { ShopifyClientType } from '../schemas'
import { isInstalled } from '../utils/install'
import { useLogger } from '../utils/log'

const HYDROGEN = '@shopify/hydrogen'
const HYDROGEN_REACT = '@shopify/hydrogen-react'

export default function setupRequirements(config: ShopifyConfig, publicConfig: PublicShopifyConfig) {
  const logger = useLogger()

  if (config.clients[ShopifyClientType.CustomerAccount] && !isInstalled(HYDROGEN)) {
    logger.error(`The customer account client is configured but \`${HYDROGEN}\` is not installed. Install it (e.g. \`npm i ${HYDROGEN}\`) or remove \`shopify.clients.customerAccount\`. Disabling customer account client.`)

    config.clients[ShopifyClientType.CustomerAccount] = undefined
    publicConfig.clients[ShopifyClientType.CustomerAccount] = undefined
  }

  if (config.analytics && !isInstalled(HYDROGEN_REACT)) {
    logger.error(`Analytics is enabled but \`${HYDROGEN_REACT}\` is not installed. Install it (e.g. \`npm i ${HYDROGEN_REACT}\`) or disable \`shopify.analytics\`. Disabling analytics.`)

    config.analytics = false
    publicConfig.analytics = false
  }
}
