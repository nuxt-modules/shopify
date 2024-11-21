# GraphQL Codegen

First of all, we would like to thank the authors of the following libraries for making this possible:

- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [Shopify Codegen Preset](https://github.com/Shopify/shopify-app-js/tree/main/packages/api-clients/api-codegen-preset)

## Introduction

This module provides a seamless, fully typed API integration for Shopify. All typings are automatically generated in the
background, adapting dynamically to the queries you write.

### Example Usage

```ts
// ~/server/api/example.ts

// ...
const storefront = useStorefront()

const myQuery = await storefront.request(`#graphql
    query ExampleQuery {
        menu(handle: "main-menu") {
            ...MenuFields
        }
        products(first: 10) {
            ...ProductFields
        }
    }
`)
// ...
```

### Key Highlights:

- myQuery.data.products is automatically typed as ProductConnection.
- myQuery.data.menu is automatically typed as Menu.

> Note: If your ProductFields fragment includes only specific fields, such as nodes -> title, the generated type will
> reflect only those fields.

As you can see, there’s no need for manual typing — everything is generated for you automatically!

## Generated Files

Depending on your configuration, the following files are generated:

### Storefront

- .nuxt/schema/storefront.schema.json
- .nuxt/types/storefront/storefront.types.d.ts
- .nuxt/types/storefront/storefront.operations.d.ts

### Admin

- .nuxt/schema/admin.schema.json
- .nuxt/types/admin/admin.types.d.ts
- .nuxt/types/admin/admin.operations.d.ts

These files are seamlessly integrated into Nuxt using Nuxt Templates, making them fully accessible within the framework.

## Configuration

The module options allow you to configure code generation as follows:

### Available Options:

- `shopify`
  - `clients`
    - `storefront | admin`
      - `skipCodegen: boolean` – Skip code generation for the specified client.
      - `documents: []` – An array of glob patterns, relative to the Nuxt root, specifying the query documents to
      include.

### Advanced Customization: Hooks

If you need to customize the code generation process, refer to the hooks provided in the following file:
[types/index.d.ts](https://github.com/konkonam/nuxt-shopify/blob/main/src/types/index.d.ts)
