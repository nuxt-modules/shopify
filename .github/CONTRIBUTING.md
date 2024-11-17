# Contributing

First off, thank you for taking the time to contribute to the nuxt-shopify module ❤️

Here are some guidelines to get you started.

## Setup

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

## Development

### Linting

```bash
pnpm run lint
```

### Testing

```bash
pnpm run test
```

### Type checking

```bash
pnpm run typecheck
```
    
### Building

```bash
pnpm run build
```

## Pull Requests

- Please create a new branch for each PR.
    - Use `feat/` for new features.
    - Use `fix/` for bug fixes.
    - Use `docs/` for documentation changes.
- Please ensure your PR passes all checks.
- Please ensure your PR is rebased on the latest commit of the `main` branch.

## Releasing

1. Update the version in `package.json` and `package-lock.json`.
2. Update the changelog in `CHANGELOG.md`.
3. Commit the changes and push to the `main` branch.
4. Create a new release on GitHub.
5. Run `pnpm run release` to publish the package to npm.

[Learn more about semantic versioning](https://semver.org/).
