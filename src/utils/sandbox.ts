import type { Nuxt } from '@nuxt/schema'
import type { H3Event } from 'h3'

import { addDevServerHandler } from '@nuxt/kit'
import { createClient } from '../runtime/utils/clients'
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import type { ShopifyConfig } from '../types'
import type { ShopifyClientType } from './config'

import getSandboxTemplate from '../templates/sandbox-template'
import { createStorefrontConfig } from '../runtime/utils/clients/storefront'
import { createAdminConfig } from '../runtime/utils/clients/admin'

export function getSandboxUrl(nuxt: Nuxt, clientType: ShopifyClientType) {
    const url = new URL(nuxt.options.devServer.url)

    return url.href + '_sandbox/' + clientType
}

export function getClientConfig<T extends ShopifyClientType>(clientType: T, config?: ShopifyConfig) {
    const clientConfig = config?.clients?.[clientType] as ShopifyConfig['clients'][T]

    if (!clientConfig) throw new Error(`Could not create ${clientType} client`)

    const {
        skipCodegen: _skipCodegen,
        sandbox: _sandbox,
        documents: _documents,
        ...options
    } = clientConfig

    return options
}

export function getSandboxHandler(clientType: ShopifyClientType) {
    return defineEventHandler(async (event: H3Event) => {
        event.headers.set('content-type', 'text/html')

        return getSandboxTemplate(clientType)
    })
}

export function getSandboxProxyHandler(nuxt: Nuxt, clientType: ShopifyClientType) {
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

// Returns the URL to the sandbox
export function installSandbox<T extends ShopifyClientType>(
    nuxt: Nuxt,
    clientType: T,
) {
    addDevServerHandler({
        handler: getSandboxHandler(clientType),
        route: `/_sandbox/${clientType}`,
    })

    addDevServerHandler({
        handler: getSandboxProxyHandler(nuxt, clientType),
        route: `/_sandbox/proxy/${clientType}`,
    })

    return getSandboxUrl(nuxt, clientType)
}
