import type { I18nConfig } from '@shopify/hydrogen'

import { createShopifyRequestContext, createStorefrontClient, handleShopifyRoutes } from '@shopify/hydrogen'
import { defineEventHandler, getRequestURL, sendWebResponse } from 'h3'

import { useRuntimeConfig } from '#imports'
import { createStoreDomain } from '../../utils/clients/transport'
import { createRequestSessionManager, isShopifyEndpoint, toShopifyRequest } from '../utils/shopify-routes'

const DEFAULT_MARKET: I18nConfig = { country: 'US', language: 'EN' }

export default defineEventHandler(async (event) => {
  if (!isShopifyEndpoint(getRequestURL(event).pathname)) return

  const { _shopify } = useRuntimeConfig(event)

  if (!_shopify) return

  const analytics = _shopify.analytics || undefined
  const publicAccessToken = _shopify.clients.storefront?.publicAccessToken || undefined

  const i18n = analytics?.country && analytics.language
    ? { country: analytics.country, language: analytics.language } as I18nConfig
    : DEFAULT_MARKET

  const request = toShopifyRequest(event, publicAccessToken)
  const requestContext = createShopifyRequestContext({ request, i18n })

  const storefrontClient = createStorefrontClient({
    type: 'public',
    requestContext,
    config: {
      storeDomain: createStoreDomain(_shopify.name),
      publicStorefrontToken: publicAccessToken,
      storefrontId: analytics?.storefrontId,
      apiVersion: _shopify.clients.storefront?.apiVersion,
    },
  })

  const response = handleShopifyRoutes({
    request,
    requestContext,
    storefrontClient,
    sessionManager: createRequestSessionManager(event),
  })

  if (response) return sendWebResponse(event, await response)
})
