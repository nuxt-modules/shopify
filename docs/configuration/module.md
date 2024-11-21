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
                apiVersion: '2024-10',
                publicAccessToken: 'YOUR_ACCESS_TOKEN',
            },

            admin: {
                apiVersion: '2024-10',
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
        
        clients: {                                          // Available shopify clients.

            storefront: {                                   // Storefront client options.
                apiVersion: '2024-10',                      // API version to use.
                publicAccessToken: 'YOUR_ACCESS_TOKEN',     // Public access token to use.
                privateAccessToken: 'YOUR_ACCESS_TOKEN',    // Private access token to use.
                sandbox: true,                              // Enable sandbox for the client.
                skipCodegen: false,                         // Skip code generation for the client.
                documents: []                               // Glob patterns to include in code generation.
            },
            
            admin: {                                        // Admin client options.
                apiVersion: '2024-10',                      // API version to use.
                accessToken: 'YOUR_ACCESS_TOKEN',           // Access token to use.
                sandbox: true,                              // Enable sandbox for the client.
                skipCodegen: false,                         // Skip code generation for the client.
                documents: []                               // Glob patterns to include in code generation.
            },
        },
    },

    logger: {}                                              // Optional module logger configuration (Consola options).
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
                apiVersion: '2024-10',
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
                apiVersion: '2024-10',
                accessToken: 'YOUR_ACCESS_TOKEN',
            },
        },
    },
})
```

:::
