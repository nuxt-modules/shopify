![nuxt-shopify](https://raw.githubusercontent.com/konkonam/nuxt-shopify/refs/heads/main/docs/public/logo-small.png)

# Nuxt Shopify

[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Easily integrate shopify into your nuxt app.

- 📚 [Documentation](https://konkonam.github.io/nuxt-shopify)
- ✨ [Release Notes](https://github.com/konkonam/nuxt-shopify/tree/main/CHANGELOG.md)
- 🏀 [Online playground](https://stackblitz.com/github/konkonam/nuxt-shopify?file=playgrounds%2Fplayground%2Fnuxt.config.ts)

## 🚀 Features

- Plug & play Shopify integration
- Nuxt 3 & 4 ready
- Customizable GraphQL code generation
- Storefront and Admin API support
- Automatic schema updates

> [!NOTE]
> This module is still a work in progress. Stable release coming soon.

## 📦 Setup

Run the following command to install the module in your project:

```bash
npm install -D @konkonam/nuxt-shopify
```

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

      admin: {
        apiVersion: '2024-10',
        accessToken: 'YOUR_ACCESS_TOKEN',
      },
    },
  },
})
```

## 🛠️ Usage

### Type generation

Once installed, the module automatically generates your GraphQL types and saves them in:
- .nuxt/types — Type definitions
- .nuxt/schema — GraphQL schema files

To enable IDE support, add a GraphQL configuration file:

```yaml
# graphql.config.yml
schema:
  - ./.nuxt/schema/storefront.schema.json
  - ./.nuxt/schema/admin.schema.json
```

### Access APIs via Nitro endpoints

The module exposes utilities to access each API via Nitro endpoints.

#### Storefront API example

```typescript
export default defineEventHandler(async () => {
    const storefront = useStorefront()

    return await storefront.request(...)
})
```

#### Admin API example

```typescript
export default defineEventHandler(async () => {
    const admin = useAdmin()

    return await admin.request(...)
})
```

### Advanced configuration

Customize Shopify and GraphQL code generation via Nuxt hooks.

#### Modify Shopify configuration

```typescript
export default defineNuxtConfig({
    hooks: {
        'shopify:config': ({ nuxt, config }) => {
            // Modify Shopify config here
        },
    },
})
```

#### Modify GraphQL codegen configuration

```typescript
export default defineNuxtConfig({
    hooks: {
        'shopify:codegen': ({ nuxt, generates }) => {
            // Modify GraphQL codegen config here
        },
    },
})
```

[GraphQL codegen config reference](https://the-guild.dev/graphql/codegen/docs/config-reference/codegen-config)

## 🤝 Contributing

1. Clone this repository
2. Install dependencies using:
    ```bash
    pnpm install
    ```
    (Make sure pnpm is enabled with `corepack enable`. [Learn more](https://pnpm.io/installation#using-corepack).)
3. Run `pnpm run dev:prepare` to generate type stubs.
4. Start the default [playground](https://github.com/konkonam/nuxt-shopify/tree/main/playgrounds/playground) with:
    ```bash
   pnpm run dev
    ```

## 📜 License

Published under the [MIT License](https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE).

[license-src]: https://img.shields.io/github/license/konkonam/nuxt-shopify.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com