# Nuxt Shopify Template (WIP)

[![Github Actions][github-actions-src]][github-actions-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

> [!WARNING]
> 🚧 This template is a work in progress and is not yet ready for production use. Please check back later for updates. 🚧

- 🏀 [Online demo (coming soon)](https://nuxt-shopify.vercel.app/)
- 📚 [Nuxt Shopify documentation](https://shopify.nuxtjs.org)

## ⚡️ Features

- 🛍️ **Shopify Integration**: Sell your products directly from your Nuxt app with [Nuxt Shopify](https://github.com/nuxt-modules/shopify)
- 📝 **Content Management**: Change the template content to your needs with Nuxt Content
- 🌐 **Internationalization**: Built-in page localizations with Nuxt i18n
- 🔒 **Authentication**: Built-in authentication and customer management with Nuxt Auth Utils
- 👤 **Order and Account Management**: View and manage order status and customer accounts
- 🧩 **UI Components**: Built with Nuxt UI components and Tailwind 4 for a consistent look and feel
- 🖼️ **Image Optimization**: Automatically optimized images with Nuxt Image
- 🔗 **Type Safety**: Fully type-safe and checked with Vue-Tsc
- 🧹 **Code Quality**: Minimally configured ESLint for code quality

### 🛒 E-Commerce Features (WIP 🚧)

- **Product Listing & Filters**: Display products with images, titles, and prices
- **Product Details**: Show detailed information about each product, including variants and options
- **Cart Management**: Add, remove, and update items in the cart
- **Checkout Process**: Seamlessly integrate with Shopify's Storefront API for a smooth checkout experience
- **Order Management**: View and manage customer orders
- **Customer Accounts**: Allow customers to create accounts, view order history, and manage their profiles

## 🚀 Quick Start

Deploy to vercel:

[![Deploy to Vercel][vercel-src]][vercel-href]

Deploy to Cloudflare:

[![Deploy to Cloudflare][cloudflare-src]][cloudflare-href]

### Setup

Run the following command to clone the shop template:

```sh
npx @nuxtjs/shopify my-shop
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

Create a `.env` file in the root of the project and add your Shopify credentials:

```sh
NUXT_SHOPIFY_NAME="YOUR_SHOP_NAME"
NUXT_SHOPIFY_CLIENTS_STOREFRONT_API_VERSION="2025-07"
NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN="YOUR_PUBLIC_ACCESS_TOKEN"
```

And that's it! Now your template is ready to use.

## 🛠️ Usage

### Development

To start the development server run the `dev` command:

```sh
npm run dev
```

The server will be available at: http://localhost:3000/.

To use the GraphQL playground for the Storefront API navigate to: http://localhost:3000/_sandbox/storefront.

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
[cloudflare-href]: https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fnuxt-modules%2Fshopify%2Ftemplate
