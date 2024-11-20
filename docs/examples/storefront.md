# Storefront API

## Basic usage



## Using validation

Using Nitro's built-in input validation, you can match the variables of your GraphQL queries before sending them to the API.

For this example we'll use the Zod library, but you can use any validation library you like.

First, install the validation library:

```bash
npm install zod
```

Then, import it and create a schema:

```ts
import { z } from 'zod'

const schema = z.object({
    first: z.preprocess(v => Number(v), z.number().min(1)),
})
```

> [!NOTE]
> The `preprocess` function is used to convert the string value of the `first` variable to a number and then match it against the Zod schema.
> In Nitro, the query variables are always strings, so we convert to a number here before we pass it to the API.

Next, use Nitro's built-in `getValidatedQuery` utility to validate the query variables:

```ts
// /server/api/products.ts

import { z } from 'zod'

const schema = z.object({
    first: z.preprocess(v => Number(v), z.number().min(1)),
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

Now we can call the API at `/api/products` with the following variables:

```ts
// Requests /api/products?first=1
const response = await useFetch('/api/products', {
    query: {
        first: 1,
    },
})
```

Now the request will fail if the variable `first` is not a number.
