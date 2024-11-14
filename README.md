![nuxt-shopify](https://github.com/konkonam/nuxt-shopify/tree/main/docs/.vitepress/assets/img/nuxt-shopify.png)

# Nuxt Shopify

[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Easily integrate shopify into your nuxt app.

- [✨ &nbsp;Release Notes](https://github.com/konkonam/nuxt-shopify/tree/main/CHANGELOG.md)
- [🏀 &nbsp;Online playground](https://stackblitz.com/github/konkonam/nuxt-shopify?file=playgrounds%2Fplayground%2Fnuxt.config.ts)

## Features ✨

- Nuxt 3 & 4 ready
- GraphQL generated types
- Storefront and Admin API support

> [!NOTE]
> This module is an early work in progress. Stable release coming soon.

## Setup

Run the following command to install the module in your project:

```bash
npm install -D @konkonam/nuxt-shopify
```

Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: [
    '@konkonam/nuxt-shopify',
  ],
})
```

Add your Shopify configuration to the `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  shopify: {
    name: 'quickstart-abcd1234',
    debug: true,
    clients: {
      storefront: {
        apiVersion: '2024-10',
        accessToken: 'YOUR_ACCESS_TOKEN',
      },
      admin: {
        apiVersion: '2024-10',
        accessToken: 'YOUR_ACCESS_TOKEN',
      },
    },
  },
})
```

That's it! The module will now generare the types for you. 

## Usage

TODO: Add instructions for usage

## Contributing

1. Clone this repository
2. Install dependencies using `pnpm install` (install `pnpm` with `corepack enable`, [learn more](https://pnpm.io/installation#using-corepack))
3. Run `pnpm run dev:prepare` to generate type stubs.
4. Use `pnpm run dev` to start the default [playground](https://github.com/konkonam/nuxt-shopify/tree/main/playgrounds/playground) in development mode.

## License

Published under the [MIT License](https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE).

[license-src]: https://img.shields.io/github/license/konkonam/nuxt-shopify.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com