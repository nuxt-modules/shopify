# Module configuration

The module can be configured via the `shopify` property in the `nuxt.config.ts` file.

```ts
// ~/nuxt.config.ts

export default defineNuxtConfig({
    modules: ['@konkonam/nuxt-shopify'],

    shopify: {
        name: 'quickstart-abcd1234',
        clients: {
            storefront: {
                apiVersion: '2025-04',
                publicAccessToken: 'YOUR_ACCESS_TOKEN',
            },

            admin: {
                apiVersion: '2025-04',
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
    modules: [ '@konkonam/nuxt-shopify' ],
    
    shopify: {
        name: 'quickstart-abcd1234',                        // Shopify app name.
        
        clients: {                                          // Available Shopify clients.

            storefront: {                                   // Storefront client options.
                apiVersion: '2025-04',                      // API version to use.
                publicAccessToken: 'YOUR_ACCESS_TOKEN',     // Public access token to use.
                privateAccessToken: 'YOUR_ACCESS_TOKEN',    // Private access token to use.
                sandbox: true,                              // Enable sandbox for the client.
                skipCodegen: false,                         // Skip code generation for the client.
                documents: [],                              // Glob patterns to include in code generation.
                clientName: 'storefront',                   // Name of the client.
                retries: 3,                                 // Number of retries for failed requests.
            },

            admin: {                                        // Admin client options.
                apiVersion: '2025-04',                      // API version to use.
                accessToken: 'YOUR_ACCESS_TOKEN',           // Access token to use.
                sandbox: true,                              // Enable sandbox for the client.
                skipCodegen: false,                         // Skip code generation for the client.
                documents: [],                              // Glob patterns to include in code generation.
                userAgentPrefix: '',                        // Prefix to include in the User-Agent for requests.
                isTesting: false,                           // Sets the isTesting flag for the client.
                retries: 3,                                 // Number of retries for failed requests.
            },
        },
    },

    logger: {},                                             // Optional module logger configuration (Consola options).

    autoImports: {                                          // Auto-imports configuration.

        graphql: true,                                      // Auto-import from `~/graphql` directory.
        storefront: true,                                   // Auto-import generated types for the storefront client.
        admin: true,                                        // Auto-import generated types for the admin client.
    },
})
```

The fastest way to get started is to use the minimal configuration for each client type with the default options:

::: code-group

```ts [storefront]
// ~/nuxt.config.ts

export default defineNuxtConfig({
    shopify: {
        name: 'quickstart-abcd1234',

        clients: {
            storefront: {
                apiVersion: '2025-04',
                publicAccessToken: 'YOUR_ACCESS_TOKEN',
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
                apiVersion: '2025-04',
                accessToken: 'YOUR_ACCESS_TOKEN',
            },
        },
    },
})
```

:::
