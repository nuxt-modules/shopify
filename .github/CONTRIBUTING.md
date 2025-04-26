# Contributing

First off, thank you for taking the time to contribute to the nuxt-shopify module ❤️

Here are some guidelines to get you started.

## Setup

1. Clone this repository
2. Install dependencies using:
    ```bash
    bun install
    ```
3. Run `bun run dev:prepare` to generate type stubs.
4. Start the default [playground](https://github.com/konkonam/nuxt-shopify/tree/main/playgrounds/playground) with:
    ```bash
   bun run dev
    ```

## Development

### Linting

```bash
bun run lint
```

### Testing

```bash
bun run test
```

### Type checking

```bash
bun run typecheck
```
    
### Building

```bash
bun run build
```

## Pull Requests

- Please create a new branch for each PR.
    - Use `feat/` for new features.
    - Use `fix/` for bug fixes.
    - Use `docs/` for documentation changes.
- Please ensure your PR passes all checks.
- Please ensure your PR is rebased on the latest commit of the `main` branch.

## Releasing

1. Update the version in `package.json` and `bun.lock`.
2. Update the changelog in `CHANGELOG.md`.
3. Commit the changes and push to the `main` branch.
4. Create a new release on GitHub.
5. Run `bun run release` to publish the package to npm.

[Learn more about semantic versioning](https://semver.org/).
