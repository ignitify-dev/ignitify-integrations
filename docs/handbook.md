# Handbook: write, check and publish an integration

For contributors and maintainers. The acceptance rules and versioning are in [GOVERNANCE.md](../GOVERNANCE.md); how to send a change is in [CONTRIBUTING.md](../CONTRIBUTING.md). When this handbook and those files differ, they win. The design behind the manifest and `core` is [ADR-0001](../artifacts/ignitify-integrations/architect/00-Archived/ADR-0001-integration-store/ADR-0001-integration-store.md); upgrading a draft is [ADR-0003](../artifacts/ignitify-integrations/architect/ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md).

## 1. The manifest (`integration.yaml`)

Every integration has one manifest in its folder, and the manifest is in the package's published `files`. It says what the integration needs from `task.yaml`. The JSON Schema is `MANIFEST_SCHEMA` in `@ignitify-integrations/core`, built from `core/src/constants.ts`. The design is [ADR-0001 §4](../artifacts/ignitify-integrations/architect/00-Archived/ADR-0001-integration-store/ADR-0001-integration-store.md).

Version, description and licence are in `package.json` only.

### 1.1 Fields

| Field                            | Required     | Meaning                                                                                                                                                                              |
| :------------------------------- | :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`                 | yes          | `1`                                                                                                                                                                                  |
| `name`                           | yes          | Equals the folder name. The npm name is `@ignitify-integrations/<name>`                                                                                                              |
| `runtimes`                       | yes          | `[node]`                                                                                                                                                                             |
| `secrets`                        | no           | Default secret names the code reads from `ctx.secrets` (upper snake case, at most 64 characters)                                                                                     |
| `network.type`                   | with network | `none`, `egress` or `bidirectional`                                                                                                                                                  |
| `network.egress_allow`           | no           | A fixed host list, at most 32, lower case, no IP addresses. No wildcard (`*`)                                                                                                        |
| `network.egress_hint`            | no           | One short line for hosts that vary per tenant. The plan prints it under "you add"                                                                                                    |
| `network.inbound_port`           | no           | Only with `bidirectional`. The port the code listens on                                                                                                                              |
| `network.inbound_routes`         | no           | Only with `bidirectional`. `[{ prefix: /live/ }]`, at most 32 routes of at most 256 characters. A route at or under `/__callback/` is refused: it would shadow the platform callback |
| `network.inbound_max_concurrent` | no           | Only with `bidirectional`. In-flight inbound requests                                                                                                                                |
| `execution`                      | no           | `duration` (`short`, `long`), `interaction` (`boundary-only`, `continuous`)                                                                                                          |
| `system_packages`                | no           | OS packages the code runs as separate processes. The plan line says `runs <package>`                                                                                                 |
| `min_preset`                     | no           | The smallest preset that works                                                                                                                                                       |

### 1.2 Example

```yaml
schema_version: 1
name: s3-storage
runtimes: [node]
secrets: [S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY]
network:
  type: egress
  egress_hint: 'your bucket host: <bucket>.s3.<region>.amazonaws.com on AWS, or the host of your custom endpoint'
```

### 1.3 What `integration:add` does with it

`ignitify integration:add <name> --task <slug> [--yes | --dry-run]` runs `npm install @ignitify-integrations/<name>`, reads `integration.yaml` from the installed package, and prints a plan. Line 1 is `@ignitify-integrations/<name>@<version> · settings only` (or `settings + code`, and `runs ffmpeg` for a system package). The rest lists every change, then the "you add" lines (secret values to set, hosts from `egress_hint`). `--dry-run` stops after the plan; `--yes` skips the question; with no terminal and no `--yes` it refuses.

`task.yaml` gets no new field; `package.json` and the lockfile are the record.

The rules `core` applies are in [ADR-0001 §5](../artifacts/ignitify-integrations/architect/00-Archived/ADR-0001-integration-store/ADR-0001-integration-store.md#5-the-rules-core-applies).

## 2. Write an integration

### 2.1 Pass the value test first

Write down what a tenant no longer needs to build or run. If the answer is "they skip `npm install`", stop: the vendor SDK is enough.

### 2.2 Settings only, or code?

| The vendor SDK…                                                                                 | Write                                              |
| :---------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| is good, and the task only needs a secret and hosts                                             | **settings only**: a manifest and a README example |
| does not sign, verify webhooks, page lists or refresh tokens in this runtime, or does not exist | **code** in `src/`                                 |
| — it is a feature, driven by an open-source tool                                                | **code** and `system_packages` (informally, a kit) |

### 2.3 Generate it

```bash
npm run new-item -- my-service          # settings only
npm run new-item -- my-service --code   # with a src/ skeleton
npm run new-item -- my-service --draft  # a draft: never published
```

This writes `integrations/my-service/`, which already passes `npm run check:items`. Fill in the manifest (§1), the code and the README. With `--code`, the package depends on `@ignitify-integrations/runtime`; also add the folder to the `references` of the root `tsconfig.json`, because `npm run build` builds only the listed projects (`check:items` refuses an integration with `src/` that is not listed).

A **draft** has `"private": true` and version `0.0.0` in `package.json`, and an upgrade checklist in `TODO.md`. `check:items` checks its manifest and README like any integration, skips the publish rules, and refuses a draft without `TODO.md`. npm and Changesets never publish or version it. To upgrade a draft, finish its checklist: remove `"private": true`, add `publishConfig` and the `repository` field with its own folder (`check:items` requires both for a published package), set the version, and delete `TODO.md`.

### 2.4 Rules

- Use `@ignitify-integrations/runtime`: `TaskCtx`, `Result`, `readSecret`. Do not redefine them.
- Read credentials from the default secret names in the manifest, and accept an explicit `credentials` option for a second account.
- A host that varies per tenant goes in `network.egress_hint`, never in `egress_allow`.
- Pure functions decide; a thin shell does the I/O. Make the client, `fetch`, the clock and signals injectable so tests need no network.
- Names, limits and messages go in `src/constants.ts`.
- Errors never contain a secret. Watch out for secrets inside URLs.
- Logs go to `console` (the platform routes it). There is no `ctx.log`.
- Code that runs a tool from `system_packages` starts it as a child process and lets the tenant pass raw tool arguments. The README records the tool's licence.

### 2.5 The README

Short, and about the integration, not the vendor API. These sections, in this order (`check:items` checks them; the design is ADR-0001 §3.1):

| Section               | Holds                                                            |
| :-------------------- | :--------------------------------------------------------------- |
| `# <name>` + one line | What it does for a task                                          |
| `## Add it`           | `integration:add`, the secrets to set, what "you add" means here |
| `## Use it`           | The smallest working task code                                   |
| `## Grow your task`   | Options, patterns, integrations it combines with, guide chapters |
| `## Limits`           | What it cannot do today, and why                                 |

For vendor setup (a bot, a bucket, a key), write one line and link the vendor's docs.

### 2.6 Tests

- Unit tests for every decision (`test/*.test.ts`).
- Code that talks to a service: a contract test against a real server where one runs locally (MinIO for S3), skipped when the env vars are not set.
- `system_packages`: a test with the real tool, skipped when it is not installed.

### 2.7 Ship it

Add a changeset for a change to a package that is on npm (`npx changeset`; see the versioning rule in [GOVERNANCE.md](../GOVERNANCE.md)); a package that is not on npm yet needs none. Then open a pull request. A maintainer runs the release workflow by hand (§3).

## 3. Publish and release

### 3.1 Trust

- Packages are published only by the [release workflow](../.github/workflows/release.yml), with npm trusted publishing and provenance. No npm token exists. Trust is npm provenance; the tenant's lockfile pins the version.
- A new package's **first version is published once by hand** (at the repo root run `npm run build && npm run copy-legal`, then `npm publish --provenance=false` in the package folder, with 2FA: without those two steps the package ships without its code or its `LICENSE` and `NOTICE`), because npm needs the package before trusted publishing can be set. npm then also lists a `0.0.0-stage` version: deprecate it (`npm deprecate "@ignitify-integrations/<name>@0.0.0-stage" "not a release: use 0.1.0 or later"`).
- Then set trusted publishing on the package's npm settings page: GitHub Actions, `ignitify-dev` / `ignitify-integrations`, workflow `release.yml`, no environment, and tick **Allow `npm publish`**. Without that box npm allows only `npm stage publish`, and the workflow fails with E403 "OIDC permission denied".

### 3.2 Release

1. On a branch: make the change and add a changeset (`npx changeset`).
2. Run `npm run version` on the branch: it applies the changesets and writes the changelogs. If a package now needs a newer internal dependency, raise that range by hand (Changesets raises a range only when a dependency leaves it), then run `npm install --package-lock-only`.
3. Commit with `-s`, open a pull request, and merge it when `check` and `DCO` pass.
4. Run the release workflow by hand (Actions → release → Run workflow). It publishes every non-private package whose version is not on npm yet, with provenance, and makes the git tags and GitHub releases. A new package must have its first version on npm (§3.1) before you run it: the workflow cannot do a first publish.

### 3.3 Only the latest version is supported

- Right after each release, a maintainer marks every older version obsolete, with 2FA: `npm deprecate "@ignitify-integrations/<name>@<NEW" "obsolete: use NEW or later"`.
- The release tag `@ignitify-integrations/<name>@<version>` and its GitHub release are the archive of an old version. We never fix or answer issues for an obsolete version.
- npm keeps old tarballs, so an old lockfile still installs an obsolete version, with npm's warning.

## 4. `core` and its clients

- A client (the ignitify CLI) calls `core` and copies no rule. It decides "settings only" or "settings + code" with `core`'s `hasCode`.
- The client tests every platform fact it copies against the platform's own value (10 facts): from `core`, `EGRESS_ALLOW_MAX`, `INBOUND_ROUTES_MAX`, `INBOUND_ROUTE_MAX_LENGTH`, `PRESETS` and `CALLBACK_ROUTE_PREFIX`; from `runtime`, `ROUTE_PREFIX_PATTERN`, `SECRET_NAME_PATTERN`, `SECRET_NAME_MAX_LENGTH`, `INBOUND_PORT_MIN` and `INBOUND_PORT_MAX`.
