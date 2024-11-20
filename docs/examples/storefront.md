# Storefront API

## Using zod

```typescript
const schema = z.object({
    first: z.number().optional(),
})

export default defineEventHandler(async () => {
    const storefront = useStorefront()
    const variables = await getValidatedQuery(event, schema.parse)

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

    return storefront.request(query, { variables })
})
```
