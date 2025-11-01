import type { Nuxt } from '@nuxt/schema'
import type { H3Event } from 'h3'

import type { ShopifyClientType } from '../schemas/config'
import type { ShopifyConfig } from '../types'

import { addDevServerHandler } from '@nuxt/kit'
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'

import { createClient } from '../runtime/utils/client'
import { createStorefrontConfig } from '../runtime/utils/storefront'
import { createAdminConfig } from '../runtime/utils/admin'
import getSandboxTemplate from '../templates/sandbox-template'

export function getSandboxUrl(nuxt: Nuxt, clientType: ShopifyClientType): string {
    const url = new URL(nuxt.options.devServer.url)

    return url.href + '_sandbox/' + clientType
}

export function createSandboxHandler(clientType: ShopifyClientType) {
    return defineEventHandler(async (event: H3Event) => {
        event.headers.set('content-type', 'text/html')

        return getSandboxTemplate(clientType)
    })
}

export function createSandboxProxyHandler(nuxt: Nuxt, clientType: ShopifyClientType) {
    return defineEventHandler(async (event: H3Event) => {
        const config = nuxt.options.runtimeConfig._shopify

        const schema = z.object({
            query: z.string(),
            variables: z.record(z.string(), z.unknown()).optional(),
        })

        const body = await readValidatedBody(event, schema.parse)

        let client: ReturnType<typeof createClient>

        switch (clientType) {
            case 'storefront':
                client = createClient(createStorefrontConfig(config))
                break
            case 'admin':
                client = createClient(createAdminConfig(config))
                break
            default:
                throw new Error('The requested client is not supported')
        }

        return client.request(body.query, {
            variables: body.variables,
        })
    })
}

export function registerSandbox(nuxt: Nuxt, clientType: ShopifyClientType): string {
    addDevServerHandler({
        handler: createSandboxHandler(clientType),
        route: `/_sandbox/${clientType}`,
    })

    addDevServerHandler({
        handler: createSandboxProxyHandler(nuxt, clientType),
        route: `/_sandbox/proxy/${clientType}`,
    })

    return getSandboxUrl(nuxt, clientType)
}

export function shouldEnableSandbox(nuxt: Nuxt, clientConfig: ShopifyConfig['clients'][ShopifyClientType]): boolean {
    return !!(nuxt.options.dev && clientConfig?.sandbox)
}
