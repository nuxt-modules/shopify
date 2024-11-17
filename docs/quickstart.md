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
export default defineNuxtConfig({
  modules: [
    'nuxt-shopify',
  ],
})
```

Add your Shopify configuration to the `nuxt.config.ts`:

```ts
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
    
To enable IDE support, add a GraphQL configuration file:
        
```yaml
# graphql.config.yml
schema:
  - ./.nuxt/schema/storefront.schema.json
  - ./.nuxt/schema/admin.schema.json
```

### Access Storefront API via Nitro endpoints

The module exposes utilities to access each API via Nitro endpoints.

#### Storefront API example

Obtain a list of products from the storefront API:

```typescript
export default defineEventHandler(async () => {
    const storefront = useStorefront()

    return await storefront.request(`
        #graphql
        query FetchProducts(
            $after: String
            $before: String
            $first: Int
            $last: Int
            $query: String
            $reverse: Boolean
        ){
            products(
                after: $after
                before: $before
                first: $first
                last: $last
                query: $query
                reverse: $reverse
            ){
                nodes {
                    id
                    title
                    description
                }
            }
        }
    `, {
        variables: {
            first: 1,
        },
    })
})
```
