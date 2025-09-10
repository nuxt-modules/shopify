# Contributing

First off, thank you for taking the time to contribute to the nuxt-shopify module ❤️

Here are some guidelines to get you started.

## Setup

1. Clone this repository
2. Install dependencies using:
    ```bash
    bun install
    ```
3. Run `bun run prepare:dev` to generate type stubs.

## Development

Start the default [playground](https://github.com/nuxt-modules/shopify/tree/main/playgrounds/playground):
```bash
bun run dev
```

### Linting

```bash
bun run lint
```

### Type checking

```bash
bun run typecheck
```

### Testing

```bash
bun run test
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

1. Update the version in `package.json`.
2. Update the changelog in `CHANGELOG.md`.
3. Commit the changes and merge to the `main` branch.
4. Create a new release on GitHub.

[Learn more about semantic versioning](https://semver.org/).
