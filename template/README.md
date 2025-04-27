<p align="center">
  <img height="107" src="https://raw.githubusercontent.com/konkonam/nuxt-shopify/refs/heads/main/docs/public/logo-readme.png">
</p>

# Nuxt Shopify Template (WIP)

[![Github Actions][github-actions-src]][github-actions-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

> [!WARN]
> This template is a work in progress and is not yet ready for production use. Please check back later for updates.

- 🏀 [Online demo](https://example.com)
- 📚 [Documentation](https://konkonam.github.io/nuxt-shopify)

## 📦 Setup

Run the following command to clone the shop template:

```sh
npx @konkonam/nuxt-shopify my-shop
```

Install the dependencies:

```sh
cd my-shop

npm install
```

Create a `.env` file in the root of the project and add your Shopify credentials:

```sh
NUXT_SHOPIFY_NAME="quickstart-abcd1234"
NUXT_SHOPIFY_API_VERSION="2025-04"
NUXT_SHOPIFY_STOREFRONT_PUBLIC_ACCESS_TOKEN="YOUR_PUBLIC_ACCESS_TOKEN"
```

That's it! The template is ready.

## 🛠️ Usage

### Development

To start the development server run the `dev` command:

```sh
npm run dev
```

The server will be available at: http://localhost:3000/.

### Build

To build the application use the `build` command:

```sh
npm run build
```

### Lint

The template has an `eslint` configuration file, you can run it with the `lint` command:

```sh
npm run lint
```

### Typecheck

The template uses `vue-tsc` to make sure all types are correct, you can run it with the `typecheck` command:

```sh
npm run typecheck
```

## 📜 License

Published under the [MIT License](https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE).

[github-actions-src]: https://github.com/konkonam/nuxt-shopify/actions/workflows/test.yml/badge.svg
[github-actions-href]: https://github.com/konkonam/nuxt-shopify/actions

[license-src]: https://img.shields.io/github/license/konkonam/nuxt-shopify.svg?style=flat&colorA=18181B&colorB=31C553
[license-href]: https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt
[nuxt-href]: https://nuxt.com
