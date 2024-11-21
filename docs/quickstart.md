# Quickstart

This page will guide you through the basic setup of the module.

## Installation

Run the following command to install the module in your project:

```bash
npm install -D @konkonam/nuxt-shopify
```

## Configuration

Add the module to your `nuxt.config.ts`:

```ts
// ~/nuxt.config.ts

export default defineNuxtConfig({
    modules: [
        '@konkonam/nuxt-shopify',
    ],
})
```

Add your Shopify configuration to the `nuxt.config.ts`:

```ts
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

## Usage

### Type generation
    
To enable IDE support, you can add a GraphQL configuration file to the root of your project:

```yaml
# ~/graphql.config.yml
schema:
  - ./.nuxt/schema/storefront.schema.json
  - ./.nuxt/schema/admin.schema.json
```

### Access Storefront API via Nitro endpoints

The module exposes utilities to access each API via Nitro endpoints.

#### Storefront API example

Obtain a list of products from the storefront API:

```typescript
// ~/server/api/products.ts

export default defineEventHandler(async () => {
    const storefront = useStorefront()

    const query = `#graphql
        query FetchProducts($first: Int) {
            products(first: $first) {
                nodes {
                    id
                    title
                    description
                }
            }
        }
    `

    return storefront.request(query, {
        variables: {
            first: 1,
        },
    })
})
```

### Use the GraphiQL Explorer for faster development

The module automatically installs the [GraphiQL Explorer](https://www.npmjs.com/package/@graphiql/plugin-explorer)
as a sandbox for each client type.

To access the sandbox for the Storefront API, use the following URL:

```
http://localhost:3000/_sandbox/storefront
```

> [!NOTE]
> The sandbox is only available while the Nuxt dev server is running.
