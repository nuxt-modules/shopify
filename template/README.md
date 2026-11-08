# Nuxt Shopify Template

[![Github Actions][github-actions-src]][github-actions-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

- 🏀 [Online demo](https://nuxt-shopify.vercel.app/)
- 📚 [Nuxt Shopify documentation](https://shopify.nuxtjs.org)

## Features

- 🛍️ **Shopify Integration**: Sell your products directly from your Nuxt app with [Nuxt Shopify](https://github.com/nuxt-modules/shopify)
- 🧭 **Shopify's Standard Paths**: Products, collections, search with filters, cart, blogs, pages and policies at the paths Shopify links to, plus a sitemap, `robots.txt` and `/discount/<code>` links
- 🌐 **Internationalization**: Built-in page localizations with Nuxt i18n
- 👤 **Order and Account Management**: Log in with the Customer Account API to view your profile and order history
- 🔎 **Analytics and Cookies**: Integrated analytics and cookie consent management using the Customer Privacy API
- 🧩 **UI Components**: Built with Nuxt UI components and Tailwind 4 for a consistent look and feel
- 🖼️ **Image Optimization**: Automatically optimized images with Nuxt Image
- 🔗 **Type Safety**: Fully type-safe and checked with Vue-Tsc
- 🧹 **Code Quality**: Minimally configured ESLint for code quality

## Quick Start

Deploy to vercel:

[![Deploy to Vercel][vercel-src]][vercel-href]

Deploy to Cloudflare:

[![Deploy to Cloudflare][cloudflare-src]][cloudflare-href]

### Setup

Run the following command to clone the shop template:

```sh
npx @nuxtjs/shopify@latest init ./my-shop
```

Now you can navigate to the `my-shop` directory:

```sh
cd my-shop
```

Install the dependencies:

```sh
npm install
```

(you can also use `yarn`, `pnpm` or `bun` if you prefer)

Out of the box, the template is connected to the demo store, so it runs without any configuration. To connect your own store, create a `.env` file in the root of the project and add your Shopify credentials:

```sh
NUXT_SHOPIFY_NAME="..."
NUXT_SHOPIFY_CLIENTS_STOREFRONT_API_VERSION="2026-10"
NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN="..."
NUXT_SHOPIFY_STOREFRONT_ID="..."
```

Product pages show low stock from each variant's `quantityAvailable`, so enable the `unauthenticated_read_product_inventory` Storefront API permission for your access token. Without it, every product query fails with `ACCESS_DENIED`.

The customer account (login, profile and order history) is always enabled, so add the client ID of your store's [Customer Account API](https://shopify.nuxtjs.org/essentials/customer-account) as well:

```sh
NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_CLIENT_ID="..."
```

Shopify only signs customers in on HTTPS, so the template serves the app over local HTTPS with the `localHttps` plugin of `@shopify/hydrogen`. Install its local certificates once with `npx hydrogen certs install`, then start the dev server with `npm run dev:https`. See the [Customer Account API guide](https://shopify.nuxtjs.org/essentials/customer-account#local-development) for details.

In development, a session password for the customer account is generated for you. In production, set `NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD` to a random secret of at least 32 characters.

The template builds its languages and countries from your store's markets. A language is only offered when `i18n/locales` has a translation file named after its lowercase Shopify language code (`en.json`, `de.json`, `es.json`, `fr.json` and `it.json` are included), so add one, like `nb.json`, for every other language your store sells in. Languages with a region (`PT_BR`, `PT_PT`, `ZH_CN` and `ZH_TW`) don't fit the template's `<language>-<country>` locale codes, so the build skips them with a warning. Nuxt UI's own labels, like its close buttons, fall back to English for languages Nuxt UI doesn't translate.

And that's it! Now your template is ready to use.

## 🛠️ Usage

### Development

To start the development server run the `dev` command:

```sh
npm run dev
```

The server will be available at: http://localhost:3000/.

To use the GraphQL explorer for the Storefront API navigate to: http://localhost:3000/_explorer/storefront.

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

Published under the [MIT License](https://github.com/nuxt-modules/shopify/tree/main/LICENSE).

[github-actions-src]: https://github.com/nuxt-modules/shopify/actions/workflows/test.yml/badge.svg
[github-actions-href]: https://github.com/nuxt-modules/shopify/actions

[license-src]: https://img.shields.io/github/license/nuxt-modules/shopify.svg?style=flat&colorA=18181B&colorB=31C553
[license-href]: https://github.com/nuxt-modules/shopify/tree/main/LICENSE

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt
[nuxt-href]: https://nuxt.com

[vercel-src]: https://vercel.com/button
[vercel-href]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-modules%2Fshopify%2Ftree%2Fmain%2Ftemplate

[cloudflare-src]: https://deploy.workers.cloudflare.com/button
[cloudflare-href]: https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fnuxt-modules%2Fshopify%2Ftree%2Fmain%2Ftemplate
