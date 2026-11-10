import { createCartServerHandlers, createPredictiveSearchServerHandlers, handleShopifyRoutes } from '@shopify/hydrogen'
import { defineEventHandler, getRequestURL, sendWebResponse } from 'h3'

import { useRuntimeConfig } from '#imports'
import { assertSameSite } from '../utils/csrf'
import { customerAccountContext } from '../utils/customer-account/auth'
import { handleCustomerAccountOrCartRoutes } from '../utils/customer-account/routes'
import { applyShopifyResponseHeaders, getShopifyRequestContext } from '../utils/request-context'
import {
  isAjaxCartEndpoint,
  isCartEndpoint,
  isCustomerAccountEndpoint,
  isShopifyApiProxyPath,
  isShopifyEndpoint,
  toShopifyRequest,
} from '../utils/routes'
import { resolveShopifyScripts } from '../utils/shop'
import { createStorefrontServerCache } from '../utils/storefront/cache'
import { createHydrogenStorefrontClient, getShopifyRedirect } from '../utils/storefront/hydrogen'

export default defineEventHandler(async (event) => {
  const { _shopify } = useRuntimeConfig(event)

  if (!_shopify) return

  const storefront = !!(_shopify.clients.storefront || _shopify.analytics)
  const customerAccount = !!_shopify.clients.customerAccount
  const serverCache = !!(_shopify.clients.storefront?.cache && _shopify.clients.storefront.cache.server)

  event.context._shopify = {
    ...(storefront ? { redirect: getShopifyRedirect, scripts: resolveShopifyScripts } : {}),
    ...(customerAccount ? { customerAccount: customerAccountContext } : {}),
    ...(serverCache ? { storefrontCache: createStorefrontServerCache } : {}),
  }

  const { pathname, searchParams } = getRequestURL(event)

  const shopifyEndpoint = isShopifyEndpoint(pathname, { storefront, customerAccount })
  const variantLink = storefront && searchParams.has('variant') && (event.method === 'GET' || event.method === 'HEAD')

  if (!shopifyEndpoint && !variantLink) return

  if (isShopifyApiProxyPath(pathname) && (!shopifyEndpoint || event.method !== 'POST')) return

  if ((isCartEndpoint(pathname) || isAjaxCartEndpoint(pathname)) && event.method !== 'GET' && event.method !== 'HEAD') assertSameSite(event)

  const requestContext = shopifyEndpoint
    ? await getShopifyRequestContext(event)
    : await getShopifyRequestContext(event).catch(() => undefined)

  if (!requestContext) return

  const routes = {
    request: toShopifyRequest(event, _shopify.clients.storefront?.publicAccessToken || undefined),
    requestContext,
    storefrontClient: createHydrogenStorefrontClient(requestContext, _shopify),
    routeTemplates: _shopify.routeTemplates,
  }

  const response = customerAccount && (isCartEndpoint(pathname) || isCustomerAccountEndpoint(pathname))
    ? handleCustomerAccountOrCartRoutes(event, _shopify, routes, pathname)
    : handleShopifyRoutes({ ...routes, handlers: [createCartServerHandlers(_shopify.cart ?? {}), createPredictiveSearchServerHandlers(_shopify.predictiveSearch ?? {})] })

  if (!response) return

  const result = await response

  const cacheControl = result.headers.get('cache-control')

  if (!cacheControl || /\b(?:private|no-store)\b/.test(cacheControl)) {
    requestContext.markResponseAsPersonalized('shopify route')
    applyShopifyResponseHeaders(event, result)
  }

  return sendWebResponse(event, result)
})
