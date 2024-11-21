import type { ShopifyClientType, ShopifyConfig } from '../types'
import type { Nuxt } from '@nuxt/schema'
import type { H3Event } from 'h3'

import { addDevServerHandler } from '@nuxt/kit'
import { createAdminApiClient } from '@shopify/admin-api-client'
import { createStorefrontApiClient } from '@shopify/storefront-api-client'
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'

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

        return `
            <!doctype html>
            <html lang="en">
                <head>
                    <title>GraphiQL - ${clientType}</title>
                    <style>
                        body {
                            height: 100%;
                            margin: 0;
                            width: 100%;
                            overflow: hidden;
                        }
                        
                        #graphiql {
                            height: 100vh;
                        }
                    </style>
                    
                    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
                    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
                    <script src="https://unpkg.com/graphiql/graphiql.min.js" type="application/javascript"></script>
                    <script src="https://unpkg.com/@graphiql/plugin-explorer/dist/index.umd.js" crossorigin></script>
                    <link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet"/>
                    <link href="https://unpkg.com/@graphiql/plugin-explorer/dist/style.css" rel="stylesheet"/>
                </head>
                
                <body>
                    <div id="graphiql">Loading...</div>
                    <script>
                        const root = ReactDOM.createRoot(document.getElementById('graphiql'));
                        const explorerPlugin = GraphiQLPluginExplorer.explorerPlugin();
                        const fetcher = async (graphQLParams, opts) => {
                            const headers = opts?.headers || {};
                            const response = await fetch('/_sandbox/proxy/${clientType}', {
                                method: 'POST',
                                headers: {
                                    ...headers,
                                    'Content-Type': 'application/json' 
                                },
                                body: JSON.stringify(graphQLParams),
                            });
        
                            if (!response.ok) {
                                throw new Error('Failed to fetch data');
                            }
        
                            return response.json();
                        };
    
                        root.render(
                            React.createElement(GraphiQL, {
                                fetcher,
                                defaultEditorToolsVisibility: true,
                                plugins: [explorerPlugin],
                            }),
                        );
                    </script>
                </body>
            </html>
        `
    })
}

export function getSandboxProxyHandler(nuxt: Nuxt, clientType: ShopifyClientType) {
    return defineEventHandler(async (event: H3Event) => {
        const config = nuxt.options.runtimeConfig._shopify

        const schema = z.object({
            query: z.string(),
            variables: z.record(z.unknown()).optional(),
        })

        const body = await readValidatedBody(event, schema.parse)

        let client: ReturnType<typeof createStorefrontApiClient> | ReturnType<typeof createAdminApiClient>

        switch (clientType) {
            case 'storefront':
                client = createStorefrontApiClient(getClientConfig(clientType, config))

                break
            case 'admin':
                client = createAdminApiClient(getClientConfig(clientType, config))

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
