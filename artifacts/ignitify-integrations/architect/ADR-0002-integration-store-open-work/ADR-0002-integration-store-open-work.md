# ADR-0002 — The integration store: state, how to contribute, and open work

> |                 |                                                                                                                                                                          |
> | :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | **Status**      | §2 Record (2026-11-02). §3 and §4 Reference. §5 Accepted (§5.1–§5.7 carried over from ADR-0001, 2026-10-31; §5.8 the owner, 2026-11-02). §6 and §7 Proposed (2026-11-02) |
> | **Scope**       | The current state of the store, the manifest reference, how to write an integration, what is decided but not done, open questions, known issues                          |
> | **Done record** | [ADR-0001 — The integration store](../00-Archived/ADR-0001-integration-store/ADR-0001-integration-store.md) (archived): what is built in this repo                       |
> | **Public**      | This repo is public. Write nothing about the platform's internals here                                                                                                   |

## 1. Context

A public, open-source store of integrations that a tenant adds to an ignitify task with one command.

ADR-0001 decided what an integration is, what its manifest holds and the rules `core` applies. Those parts are built and tested, and ADR-0001 is archived with only them. This ADR holds everything else: the state today, the reference a contributor needs, and the open work. When an item here is done, it moves to an archived record in the same way.

**Precedence.** ADR-0001 wins on a built rule. `GOVERNANCE.md` wins on the acceptance rules and versioning. §3 and §4 repeat those rules for the reader; when they differ, the source wins.

## 2. Current state (2026-11-02)

| Part                                   | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain and guardrails               | ✅ Built: npm workspaces, `tsc -b`, vitest, ESLint, Prettier, Renovate, REUSE (licence texts in `LICENSES/`). ✅ GitHub workflows in `.github/workflows`: `ci` (the same checks as `npm run check`, with ffmpeg and a local S3 server, plus REUSE and, on pull requests, an OSV scan), CodeQL, Scorecard. Their first runs on GitHub are not checked yet                                                                                                                         |
| `core` and `runtime`                   | ✅ Built: manifest schema and checks, `planAdd`, `planHeadline`, `checkCoverage`; `TaskCtx`, `Result`, `readSecret`. Version 0.1.0 is on npm (published by hand on 2026-11-02, without provenance); publishing needs 2FA, and tokens are disallowed. `core` has a named public API (`core/src/index.ts`); platform facts that run-time code and the schema share are in `runtime/src/platform.ts`                                                                                |
| Repo tools                             | ✅ Built: `check:items` (integrations, the root build list, and the publish rules of `core` and `runtime`), `check:licences`, `new-item`, `copy-legal`. `tools` is type-checked, not built: its scripts run from source with `tsx`. `npm run check` passes; the S3 contract test is skipped without a local S3 server                                                                                                                                                            |
| Three integrations                     | ✅ Built: `telegram` (settings only), `s3-storage` (code), `stream` (code + ffmpeg). Version 0.1.0, not on npm                                                                                                                                                                                                                                                                                                                                                                   |
| Drafts                                 | ✅ 100 settings-only drafts (`"private": true`, never published), listed in the [index](../../../../integrations/README.md). Each upgrade must pass the value test                                                                                                                                                                                                                                                                                                               |
| Changesets                             | Configured. Internal dependencies use `^` ranges; a dependent is updated only when a dependency leaves its `^` range, for example 0.1.x → 0.2.0 (`updateInternalDependencies: "minor"`). No changeset is pending: a package that is not on npm yet needs none                                                                                                                                                                                                                    |
| Decided and done (2026-11-02)          | Q4: GOVERNANCE.md has a "Drafts" section. Q5: the root README names only the integration READMEs and the guide as MIT-0. Q6: `planAdd` marks a secret the task does not declare yet with "(new)"; the READMEs say "You add only the secret values". Q7: the `stream` and `s3-storage` READMEs give the recording pattern that plays (public-read prefix). Q8: `core`'s `hasCode` (an `exports` entry) is the one "has code" rule; `check:items` refuses `src/` without `exports` |
| Release pipeline                       | ✅ `release.yml` (Changesets, npm trusted publishing, provenance) exists and runs only by hand. ✅ Trusted publishing is set for `runtime` and `core` (2026-11-02; not proven until the first release run). ⏳ The workflow must not run before the three integrations are on npm (§5.1)                                                                                                                                                                                         |
| CLI `integration:add`, `task:validate` | ⏳ Written in the ignitify CLI, not released. It can now depend on `core` `^0.1.0`                                                                                                                                                                                                                                                                                                                                                                                               |
| Guide                                  | ⏳ Outline only ([docs/guide](../../../../docs/guide/README.md))                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Nightly sandbox job                    | ✅ `nightly.yml` runs the suite every night on `master`. ⏳ The `sandbox` environment and its S3 keys are not set, so the S3 contract test is skipped there                                                                                                                                                                                                                                                                                                                      |
| npm org and GitHub repo                | ✅ The npm org `@ignitify-integrations` and the GitHub repo `ignitify-dev/ignitify-integrations` exist. `runtime` and `core` 0.1.0 are published; the integrations are not. Both packages also list a `0.0.0-stage` version that this repo did not publish                                                                                                                                                                                                                       |

**Verified:** a clean install of `core` from npm in an empty folder runs `parseManifest`, `planAdd` and `planHeadline` (2026-11-02).

**Not verified:** a publish from CI (with provenance), an integration inside a real ignitify task.

## 3. The manifest (`integration.yaml`)

Every integration has one manifest in its folder, and the manifest is in the package's published `files`. It says what the integration needs from `task.yaml`. The JSON Schema is `MANIFEST_SCHEMA` in `@ignitify-integrations/core`, built from `core/src/constants.ts`. The design is ADR-0001 §4.

Version, description and licence are in `package.json` only.

### 3.1 Fields

| Field                            | Required     | Meaning                                                                                                                                 |
| :------------------------------- | :----------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`                 | yes          | `1`                                                                                                                                     |
| `name`                           | yes          | Equals the folder name. The npm name is `@ignitify-integrations/<name>`                                                                 |
| `runtimes`                       | yes          | `[node]`                                                                                                                                |
| `secrets`                        | no           | Default secret names the code reads from `ctx.secrets` (upper snake case)                                                               |
| `network.type`                   | with network | `none`, `egress` or `bidirectional`                                                                                                     |
| `network.egress_allow`           | no           | A fixed host list, at most 32, lower case, no IP addresses. No wildcard (`*`)                                                           |
| `network.egress_hint`            | no           | One short line for hosts that vary per tenant. The plan prints it under "you add"                                                       |
| `network.inbound_port`           | no           | Only with `bidirectional`. The port the code listens on                                                                                 |
| `network.inbound_routes`         | no           | Only with `bidirectional`. `[{ prefix: /live/ }]`. A route at or under `/__callback/` is refused: it would shadow the platform callback |
| `network.inbound_max_concurrent` | no           | Only with `bidirectional`. In-flight inbound requests                                                                                   |
| `execution`                      | no           | `duration` (`short`, `long`), `interaction` (`boundary-only`, `continuous`)                                                             |
| `system_packages`                | no           | OS packages the code runs as separate processes. The plan line says `runs <package>`                                                    |
| `min_preset`                     | no           | The smallest preset that works                                                                                                          |

### 3.2 Example

```yaml
schema_version: 1
name: s3-storage
runtimes: [node]
secrets: [S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY]
network:
  type: egress
  egress_hint: 'your bucket host: <bucket>.s3.<region>.amazonaws.com on AWS, or the host of your custom endpoint'
```

### 3.3 What `integration:add` does with it

`ignitify integration:add <name> --task <slug> [--yes | --dry-run]` runs `npm install @ignitify-integrations/<name>`, reads `integration.yaml` from the installed package, and prints a plan. Line 1 is `@ignitify-integrations/<name>@<version> · settings only` (or `settings + code`, and `runs ffmpeg` for a system package). The rest lists every change, then the "you add" lines (secret values to set, hosts from `egress_hint`). `--dry-run` stops after the plan; `--yes` skips the question; with no terminal and no `--yes` it refuses.

`task.yaml` gets no new field; `package.json` and the lockfile are the record.

The rules `core` applies are in [ADR-0001 §5](../00-Archived/ADR-0001-integration-store/ADR-0001-integration-store.md#5-the-rules-core-applies).

## 4. Writing an integration

### 4.1 Pass the value test first

Write down what a tenant no longer needs to build or run. If the answer is "they skip `npm install`", stop: the vendor SDK is enough.

### 4.2 Settings only, or code?

| The vendor SDK…                                                                                 | Write                                              |
| :---------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| is good, and the task only needs a secret and hosts                                             | **settings only**: a manifest and a README example |
| does not sign, verify webhooks, page lists or refresh tokens in this runtime, or does not exist | **code** in `src/`                                 |
| — it is a feature, driven by an open-source tool                                                | **code** and `system_packages` (informally, a kit) |

### 4.3 Generate it

```bash
npm run new-item -- my-service          # settings only
npm run new-item -- my-service --code   # with a src/ skeleton
npm run new-item -- my-service --draft  # a draft: never published
```

This writes `integrations/my-service/`, which already passes `npm run check:items`. Fill in the manifest (§3), the code and the README. With `--code`, the package depends on `@ignitify-integrations/runtime`; also add the folder to the `references` of the root `tsconfig.json`, because `npm run build` builds only the listed projects (`check:items` refuses an integration with `src/` that is not listed).

A **draft** has `"private": true` and version `0.0.0` in `package.json`, and an upgrade checklist in `TODO.md`. `check:items` checks its manifest and README like any integration, skips the publish rules, and refuses a draft without `TODO.md`. npm and Changesets never publish or version it. To upgrade a draft, finish its checklist: remove `"private": true`, add `publishConfig` and the `repository` field with its own folder (`check:items` requires both for a published package), set the version, and delete `TODO.md`.

### 4.4 Rules

- Use `@ignitify-integrations/runtime`: `TaskCtx`, `Result`, `readSecret`. Do not redefine them.
- Read credentials from the default secret names in the manifest, and accept an explicit `credentials` option for a second account.
- A host that varies per tenant goes in `network.egress_hint`, never in `egress_allow`.
- Pure functions decide; a thin shell does the I/O. Make the client, `fetch`, the clock and signals injectable so tests need no network.
- Names, limits and messages go in `src/constants.ts`.
- Errors never contain a secret. Watch out for secrets inside URLs.
- Logs go to `console` (the platform routes it). There is no `ctx.log`.
- Code that runs a tool from `system_packages` starts it as a child process and lets the tenant pass raw tool arguments. The README records the tool's licence.

### 4.5 The README

Short, and about the integration, not the vendor API. These sections, in this order (`check:items` checks them; the design is ADR-0001 §3.1):

| Section               | Holds                                                            |
| :-------------------- | :--------------------------------------------------------------- |
| `# <name>` + one line | What it does for a task                                          |
| `## Add it`           | `integration:add`, the secrets to set, what "you add" means here |
| `## Use it`           | The smallest working task code                                   |
| `## Grow your task`   | Options, patterns, integrations it combines with, guide chapters |
| `## Limits`           | What it cannot do today, and why                                 |

For vendor setup (a bot, a bucket, a key), write one line and link the vendor's docs.

### 4.6 Tests

- Unit tests for every decision (`test/*.test.ts`).
- Code that talks to a service: a contract test against a real server where one runs locally (MinIO for S3), skipped when the env vars are not set.
- `system_packages`: a test with the real tool, skipped when it is not installed.

### 4.7 Ship it

Add a changeset for a change to a package that is on npm (`npx changeset`; see the versioning rule in [GOVERNANCE.md](../../../../GOVERNANCE.md)); a package that is not on npm yet needs none. Then open a pull request. A maintainer runs the release workflow by hand (§5.1).

## 5. Decided, not done yet

### 5.1 Publishing and trust

- Packages are published only by CI with npm trusted publishing and provenance. No npm token exists.
- The first version of each package is published once by hand, because npm needs the package before trusted publishing can be set for it. Done for `runtime` and `core` 0.1.0 (2026-11-02). The three integrations are published later (the owner's decision, 2026-11-02).
- Trusted publishing is set on each package's npm settings page (GitHub Actions, repo `ignitify-dev/ignitify-integrations`, workflow `release.yml`). Done for `runtime` and `core` (2026-11-02); each integration gets it after its first version.
- The release workflow runs only by hand. `changeset publish` publishes every non-private package whose version is not on npm, so the workflow must not run before the three integrations have their first version on npm.
- Trust is npm provenance. The tenant's lockfile pins the version.

### 5.2 Release and deprecation

**Only the latest version is supported** (ADR-0001 §7).

- Right after each release, a maintainer marks every older version obsolete: `npm deprecate @ignitify-integrations/<name>@"<NEW" "obsolete: use NEW"` (a manual step with 2FA; it is not known yet whether trusted publishing may run it in CI).
- The release tag `@ignitify-integrations/<name>@<version>` and its GitHub release are the archive of an old version. We never fix or answer issues for an obsolete version.
- npm keeps old tarballs, so an old lockfile still installs an obsolete version, with npm's warning.

### 5.3 `core` and its clients

- A client (the ignitify CLI) calls `core` and copies no rule. It decides "settings only" or "settings + code" with `core`'s `hasCode`.
- The client tests every copied platform fact against the platform's own value: from `core`, `EGRESS_ALLOW_MAX`, `PRESETS` and `CALLBACK_ROUTE_PREFIX`; from `runtime`, `ROUTE_PREFIX_PATTERN`, `SECRET_NAME_PATTERN`, `INBOUND_PORT_MIN` and `INBOUND_PORT_MAX` (the owner, 2026-11-02).

### 5.4 Repo setup

Done (2026-11-02): the workflows, CODEOWNERS (each released integration has its own line; drafts share one), and the issue and pull-request templates are in `.github/`.

Done in the GitHub settings (2026-11-02): the repo is public; a `master` ruleset requires the checks `check`, `reuse` and `DCO` (each tied to its app) and blocks force-push and deletion (repo admins may bypass it); the `ignitify-dev/maintainers` team has Maintain access, so CODEOWNERS is valid; the DCO app is installed; Actions may create pull requests (for the Changesets "version packages" pull request); the `sandbox` environment exists and only `master` may use it; secret scanning, push protection and Dependabot alerts are on.

Not done yet:

- The S3 sandbox keys in the `sandbox` environment, for the nightly job.
- Two maintainers and a security contact.

### 5.5 Licence

Counsel reviews the licence before the first release.

### 5.6 The guide

The guide (`docs/guide/`) has an outline. The chapters are not written.

### 5.7 How the store grows

**Principle: v1 is good enough; each version must earn its place.** v1 is built (ADR-0001 §9).

| Version                   | The tenant gets                                                                                                | Needs                                   | Not yet                                             |
| :------------------------ | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------- | :-------------------------------------------------- |
| **v2**                    | More integrations on today's platform, each passing the value test; drafts upgraded one by one; the user guide | nothing new                             | anything that needs the two platform features below |
| **v3**                    | Integrations that start a run from a provider event                                                            | the platform starts a run from an event | state between runs                                  |
| **v4**                    | Incremental fetch (a cursor between runs)                                                                      | state between runs                      | a connection store                                  |
| **later, if tenants ask** | Several OAuth accounts as a platform object                                                                    | a platform connection store             | —                                                   |

### 5.8 Decided on 2026-11-02 (from the open questions)

The owner took the recommendation for each. Q4–Q8 are done (§2); Q9 is left, on the client side.

| #   | Decision                                                                                                | Next step   |
| :-- | :------------------------------------------------------------------------------------------------------ | :---------- |
| Q9  | The client tests `core`'s copy of the preset list, as part of testing every copied platform fact (§5.3) | Client side |

## 6. Open questions

No open questions (2026-11-02).

## 7. Known issues

Each fix follows an existing rule; none adds a rule.

| Issue                                                                                                                                 | Fix                           | Basis                                                     |
| :------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------- | :-------------------------------------------------------- |
| Draft hosts and secret names are not checked against vendor docs (34 drafts say "Verify host"; one Google key has three secret names) | Check each before its upgrade | The "Hosts" and "Secrets" items of each draft's `TODO.md` |
