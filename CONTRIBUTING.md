# Contributing

Thank you for helping. Read this before you open a pull request.

## Before you start

- **Open an issue first** for a new integration. It is accepted only if it passes the **value test**: _what does a tenant no longer need to build or run?_ "They skip `npm install`" is not enough. See [GOVERNANCE.md](GOVERNANCE.md).
- Prefer **settings only** (a manifest and a README example with the vendor's own SDK or plain `fetch`). Add code only for work the vendor SDK does not do. An integration that runs an open-source tool (we call it a kit, informally) declares it in `system_packages` and never re-implements it.

## Developer Certificate of Origin (DCO)

Every commit must be signed off. This states that you wrote the change or have the right to submit it under the project licence ([developercertificate.org](https://developercertificate.org)).

```bash
git commit -s -m "feat(telegram): ..."
```

A pull request with an unsigned commit is not merged. The DCO check on each pull request enforces this.

## Workflow

1. `npm ci --ignore-scripts`
2. New integration: `npm run new-item -- <name>` (add `--code` for a `src/` skeleton)
3. Make the change. Add a changeset: `npx changeset`. Follow the versioning rule in [GOVERNANCE.md](GOVERNANCE.md).
4. `npm run check` must be green.
5. Open the pull request. A maintainer reviews it.

## Code rules

- Functional core, thin shell: decisions are pure functions; effects (network, files, processes, clock) sit at the edge and are injected.
- Results are discriminated unions (`Result` from `@ignitify-integrations/runtime`), not thrown errors, for anything a caller must branch on.
- No magic literals: names, limits and messages go in the package's `src/constants.ts`.
- No duplicated logic: use `runtime` and `core` helpers.
- No install scripts (`preinstall`, `install`, `postinstall`, `prepare`) in any package.
- Secrets never appear in errors, logs or test snapshots.
- Tests assert decisions and invariants, not line counts.

## Never put in this repo

Anything about the platform's internals: hosts, fleet layout, internal APIs, internal paths, credentials. This repository is public.
