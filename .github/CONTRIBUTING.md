# Contributing

Thank you for taking the time to contribute to the Nuxt Shopify module 💚

Here are some guidelines to get you started.

## Setup

1. Clone this repository
2. Install dependencies using:
    ```bash
    pnpm install
    ```
3. Run `pnpm run prepare:dev` to generate type stubs.

## Development

Start the default [playground](https://github.com/nuxt-modules/shopify/tree/main/playgrounds/playground-v4):
```bash
pnpm run dev
```

### Linting

```bash
pnpm run lint
```

### Type checking

```bash
pnpm run typecheck
```

### Testing

```bash
pnpm run test
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
- Please use [conventional commits](https://www.conventionalcommits.org/) for your commit messages and PR titles
  (e.g. `feat: add x`, `fix: handle y`). PRs are squash-merged, and the merge commit message drives both the
  auto-generated release notes and the next version bump.
- Please ensure your PR passes all checks.
- Please ensure your PR is rebased on the latest commit of the `main` branch.

## Releasing

Releases are automated with [uppt](https://github.com/danielroe/uppt):

1. On every push to `main`, a draft release PR (branch `release/vX.Y.Z`) is opened or updated automatically.
   The version bump is derived from the conventional commits since the last release, and the PR body contains
   the generated changelog.
2. Merging the release PR tags the release, creates a [GitHub release](https://github.com/nuxt-modules/shopify/releases)
   from the PR body, and publishes the package to npm.
