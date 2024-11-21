# Admin API

The module provides a seamless, fully typed API integration for the Shopify Admin API. All typings are automatically
generated in the background, adapting dynamically to the queries you write.

## Basic Usage

To access the Admin API, you can use the `useAdmin` utility available to the nitro server:

```ts
// ~/server/api/products.ts

export default defineEventHandler(async () => {
    const admin = useAdmin()

    return await admin.request(`#graphql
        query FetchProducts($first: Int) {
            products(first: $first) {
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

The `useAdmin` utility returns a `createAdminApiClient` instance, which you can use to make requests to the Admin API.
