# Module configuration

The module can be configured via the `shopify` property in the `nuxt.config.ts` file.

```ts
export default defineNuxtConfig({
    modules: [ '@konkonam/nuxt-shopify' ],
    
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
