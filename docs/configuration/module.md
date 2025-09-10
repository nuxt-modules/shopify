# Module configuration

The module can be configured via the `shopify` property in the `nuxt.config.ts` file.

```ts
// ~/nuxt.config.ts

export default defineNuxtConfig({
    modules: ['@nuxtjs/shopify'],

    shopify: {
        name: 'quickstart-abcd1234',
        clients: {
            storefront: {
                apiVersion: '2025-07',
                publicAccessToken: 'YOUR_ACCESS_TOKEN',
            },

            admin: {
                apiVersion: '2025-07',
                accessToken: 'YOUR_ACCESS_TOKEN',
            },
        },
    },
})
```

## Configuration reference

The module options allow you to configure the module as follows:

```ts
// ~/nuxt.config.ts

export default defineNuxtConfig({
    modules: [ '@nuxtjs/shopify' ],
    
    shopify: {
        name: 'quickstart-abcd1234',                        // Shopify app name.
        
        clients: {                                          // Available Shopify clients.

            storefront: {                                   // Storefront client options.

                apiVersion: '2025-07',                      // API version to use.
                publicAccessToken: 'YOUR_ACCESS_TOKEN',     // Public access token to use.
                privateAccessToken: 'YOUR_ACCESS_TOKEN',    // Private access token to use.
                mock: false,                                // Use mock.shop instead of <your-shop>.myshopify.com.
                proxy: true,                                // Proxy all client side requests through nitro.
                sandbox: true,                              // Enable sandbox for the client.
                skipCodegen: false,                         // Skip code generation for the client.
                headers: {},                                // Additional headers to include in requests.
                documents: [],                              // Glob patterns to include in code generation.
                clientName: 'storefront',                   // Name of the client.
                retries: 0,                                 // Number of retries for failed requests.
            },

            admin: {                                        // Admin client options.

                apiVersion: '2025-07',                      // API version to use.
                accessToken: 'YOUR_ACCESS_TOKEN',           // Access token to use.
                sandbox: true,                              // Enable sandbox for the client.
                skipCodegen: false,                         // Skip code generation for the client.
                headers: {},                                // Additional headers to include in requests.
                documents: [],                              // Glob patterns to include in code generation.
                isTesting: false,                           // Sets the isTesting flag for the client.
                retries: 0,                                 // Number of retries for failed requests.
            },
        },
    },

    logger: {},                                             // Optional module logger configuration (Consola options).

    autoImports: {                                          // Auto-imports configuration.

        graphql: true,                                      // Auto-import from `~/graphql` directory.
        storefront: true,                                   // Auto-import generated types for the storefront client.
        admin: true,                                        // Auto-import generated types for the admin client.
    },

    errors: {                                               // Error handling configuration.

        throw: true,                                        // Throw errors instead of returning them in the response.
    },
})
```

The fastest way to get started is to use the minimal configuration for each client type with the default options:

::: code-group

```ts [storefront-public]
// ~/nuxt.config.ts

export default defineNuxtConfig({
    shopify: {
        name: 'quickstart-abcd1234',

        clients: {
            storefront: {
                apiVersion: '2025-07',
                publicAccessToken: 'YOUR_ACCESS_TOKEN',
            },
        },
    },
})
```


```ts [storefront-private]
// ~/nuxt.config.ts

export default defineNuxtConfig({
    shopify: {
        name: 'quickstart-abcd1234',

        clients: {
            storefront: {
                apiVersion: '2025-07',
                privateAccessToken: 'YOUR_ACCESS_TOKEN',
            },
        },
    },
})
```

```ts [storefront-mock]
// ~/nuxt.config.ts

export default defineNuxtConfig({
    shopify: {
        name: 'my-mocked-shopify-store',

        clients: {
            storefront: {
                apiVersion: '2025-07',
                mock: true,
            },
        },
    },
})
```

```ts [admin]
// ~/nuxt.config.ts

export default defineNuxtConfig({
    shopify: {
        name: 'quickstart-abcd1234',

        clients: {
            admin: {
                apiVersion: '2025-07',
                accessToken: 'YOUR_ACCESS_TOKEN',
            },
        },
    },
})
```

:::
