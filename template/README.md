<p align="center">
  <img height="107" src="https://raw.githubusercontent.com/konkonam/nuxt-shopify/refs/heads/main/docs/public/logo-readme.png">
</p>

# Nuxt Shopify Template

[![Github Actions][github-actions-src]][github-actions-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A minimal, production-ready Shopify Template built with Nuxt.

- 🏀 [Online demo](https://nuxt-shopify.vercel.app)
- 📚 [Documentation](https://konkonam.github.io/nuxt-shopify)

## 📦 Setup

Run the following command to set up the shop template:

```sh
npm install
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

            // Optional: You can also use the built-in admin API support
            admin: {
                apiVersion: '2024-10',
                accessToken: 'YOUR_ACCESS_TOKEN',
            },
        },
    },
})
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

## 🤝 Contributing

1. Clone this repository
2. Create a `.env` file (see [`.env.example`](https://github.com/konkonam/nuxt-shopify/tree/main/.env.example))
3. Install dependencies using:
    ```bash
    bun install
    ```
4. Run `bun run prepare:dev` to generate type stubs.
5. Start the default [playground](https://github.com/konkonam/nuxt-shopify/tree/main/playgrounds/playground) with:
    ```bash
    bun run dev
    ```

## 📜 License

Published under the [MIT License](https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE).

[github-actions-src]: https://github.com/konkonam/nuxt-shopify/actions/workflows/test-template.yml/badge.svg
[github-actions-href]: https://github.com/konkonam/nuxt-shopify/actions

[license-src]: https://img.shields.io/github/license/konkonam/nuxt-shopify.svg?style=flat&colorA=18181B&colorB=31C553
[license-href]: https://github.com/konkonam/nuxt-shopify/tree/main/LICENSE

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt
[nuxt-href]: https://nuxt.com
