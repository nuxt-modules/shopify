import type { Nuxt } from '@nuxt/schema'
import type { H3Event } from 'h3'

import type { ShopifyConfig } from '../types'

import { ShopifyClientType } from '../schemas'
import { addDevServerHandler } from '@nuxt/kit'
import { createError, defineEventHandler, readValidatedBody } from 'h3'
import { kebabCase } from 'scule'
import { z } from 'zod'

import { createClient } from '../runtime/utils/client'
import { createStorefrontConfig } from '../runtime/utils/clients/storefront'
import { createCustomerAccountConfig } from '../runtime/utils/clients/customer-account'
import { createAdminConfig } from '../runtime/utils/clients/admin'
import getSandboxTemplate from '../templates/sandbox'

function getSandboxUrl(nuxt: Nuxt, clientType: ShopifyClientType): string {
    const url = new URL(nuxt.options.devServer.url)

    return url.href + '_sandbox/' + kebabCase(clientType)
}

function createSandboxHandler(clientType: ShopifyClientType) {
    return defineEventHandler(async (event: H3Event) => {
        event.headers.set('content-type', 'text/html')

        return getSandboxTemplate(clientType)
    })
}

function createSandboxProxyHandler(nuxt: Nuxt, clientType: ShopifyClientType) {
    return defineEventHandler(async (event: H3Event) => {
        const config = nuxt.options.runtimeConfig._shopify

        if (!config) throw createError({
            status: 500,
            message: 'Shopify configuration is missing',
        })

        const schema = z.object({
            query: z.string(),
            variables: z.record(z.string(), z.unknown()).optional(),
        })

        const body = await readValidatedBody(event, schema.parse)

        let client: ReturnType<typeof createClient>

        switch (clientType) {
            case ShopifyClientType.Storefront:
                client = createClient(createStorefrontConfig(config))
                break
            case ShopifyClientType.CustomerAccount:
                client = createClient(createCustomerAccountConfig(config))
                break
            case ShopifyClientType.Admin:
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
        route: `/_sandbox/${kebabCase(clientType)}`,
    })

    addDevServerHandler({
        handler: createSandboxProxyHandler(nuxt, clientType),
        route: `/_sandbox/proxy/${kebabCase(clientType)}`,
    })

    return getSandboxUrl(nuxt, clientType)
}

export function shouldEnableSandbox(nuxt: Nuxt, clientConfig: ShopifyConfig['clients'][ShopifyClientType]): boolean {
    return !!(nuxt.options.dev && clientConfig?.sandbox)
}
