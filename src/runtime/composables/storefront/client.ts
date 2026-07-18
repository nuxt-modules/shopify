import type { StorefrontApiClient, StorefrontOperations } from '@nuxtjs/shopify/storefront'

import { joinURL } from 'ufo'

import { getRequestHeader } from 'h3'

import { useRuntimeConfig, useNuxtApp, useRequestURL, useRequestEvent } from '#imports'
import { createTrackingHeaders, collectTrackingHeaders } from '../../server/utils/tracking'
import { createClient } from '../../utils/client'
import { createStorefrontConfig } from '../../utils/clients/storefront'
import useErrors from '../../utils/errors'
import useCache from '../../utils/cache'

export function useStorefront(): StorefrontApiClient<true> {
  const { _shopify } = useRuntimeConfig().public

  const config = createStorefrontConfig(_shopify)

  const nuxtApp = useNuxtApp()

  if (_shopify?.clients.storefront?.proxy && !nuxtApp.payload.prerenderedAt) {
    config.apiUrl = joinURL(useRequestURL().origin, _shopify.clients.storefront.proxy.path)
  }

  const event = import.meta.server ? useRequestEvent() : undefined

  if (event) {
    Object.assign(config.headers, createTrackingHeaders(event, getRequestHeader(event, 'cookie')))
  }

  nuxtApp.hooks.callHook('storefront:client:configure', { config })

  const originalClient = createClient<StorefrontOperations, true>(config)

  const storage = nuxtApp.$shopify?.cache?.storefront
  const cacheOptions = _shopify?.clients.storefront?.cache ? _shopify?.clients.storefront?.cache?.options : undefined

  const request: StorefrontApiClient<true>['request'] = async (operation, options) => {
    nuxtApp.hooks.callHook('storefront:client:request', { operation, options })

    const response = await useCache(storage, originalClient.request, operation, options, cacheOptions)

    if (event) collectTrackingHeaders(event, response.headers)

    if (response.errors) useErrors(nuxtApp.hooks, 'storefront:client:errors', response.errors, _shopify?.errors?.throw ?? false)

    nuxtApp.hooks.callHook('storefront:client:response', { response, operation, options })

    return response
  }

  const client = { ...originalClient, request } satisfies StorefrontApiClient<true>

  nuxtApp.hooks.callHook('storefront:client:create', { client })

  return client
}
