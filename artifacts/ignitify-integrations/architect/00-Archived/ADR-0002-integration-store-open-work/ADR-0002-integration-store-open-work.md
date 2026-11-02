# ADR-0002 — The integration store: state, how to contribute, and open work

> |                 |                                                                                                                                                                                                                                           |
> | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | **Status**      | Archived (2026-11-02): the done record of the store's first open work. The rules moved to [docs/handbook.md](../../../../../docs/handbook.md); the open work left is [ADR-0003](../../ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md) |
> | **Scope**       | The current state of the store, the manifest reference, how to write an integration, what is decided but not done, open questions, known issues (all done or moved; see §3)                                                               |
> | **Done record** | [ADR-0001 — The integration store](../ADR-0001-integration-store/ADR-0001-integration-store.md) (archived): what is built in this repo                                                                                                    |
> | **Public**      | This repo is public. Write nothing about the platform's internals here                                                                                                                                                                    |

## 1. Context

A public, open-source store of integrations that a tenant adds to an ignitify task with one command.

ADR-0001 decided what an integration is, what its manifest holds and the rules `core` applies. Those parts are built and tested, and ADR-0001 is archived with only them. This ADR held everything else: the state, the reference a contributor needs, and the open work. All of it is done or closed (2026-11-02), so it is archived too.

**Where things are now.** The manifest reference, how to write an integration, and how to publish and release are in [docs/handbook.md](../../../../../docs/handbook.md). Draft upgrades and how the store grows are in [ADR-0003](../../ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md).

## 2. Current state (2026-11-02)

| Part                                   | State                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolchain and guardrails               | ✅ Built: npm workspaces, `tsc -b`, vitest, ESLint, Prettier, Renovate. ✅ GitHub workflows in `.github/workflows`: `ci` (the same checks as `npm run check`, with ffmpeg and a local S3 server, plus an OSV scan on pull requests), CodeQL, Scorecard. All pass on GitHub                                                                                                                                                                         |
| `core` and `runtime`                   | ✅ Built: manifest schema and checks, `planAdd`, `planHeadline`, `checkCoverage`; `TaskCtx`, `Result`, `readSecret`. Version 0.1.0 is on npm (published by hand on 2026-11-02, without provenance); publishing needs 2FA, and tokens are disallowed. `core` has a named public API (`core/src/index.ts`); platform facts that run-time code and the schema share are in `runtime/src/platform.ts`                                                  |
| Repo tools                             | ✅ Built: `check:items` (integrations, the root build list, and the publish rules of `core` and `runtime`), `new-item`, `copy-legal`. `tools` is type-checked, not built: its scripts run from source with `tsx`. `npm run check` passes; the S3 contract test is skipped without a local S3 server                                                                                                                                                |
| Three integrations                     | ✅ `s3-storage` (code) and `stream` (code + ffmpeg), 0.1.0 on npm (2026-11-02). `telegram` (settings only) was built too and is now a draft (the owner, 2026-11-02)                                                                                                                                                                                                                                                                                |
| Drafts                                 | ✅ 101 drafts (`"private": true`, never published): 100 settings-only skeletons and `telegram`, listed in the [index](../../../../../integrations/README.md). Upgrades: [ADR-0003](../../ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md)                                                                                                                                                                                                       |
| Changesets                             | Configured. Internal dependencies use `^` ranges; a dependent is updated only when a dependency leaves its `^` range, for example 0.1.x → 0.2.0 (`updateInternalDependencies: "minor"`). No changeset is pending: a package that is not on npm yet needs none                                                                                                                                                                                      |
| Decided and done (2026-11-02)          | Q4: GOVERNANCE.md has a "Drafts" section. Q5: replaced by the one-licence decision (§4.2). Q6: `planAdd` marks a secret the task does not declare yet with "(new)"; the READMEs say "You add only the secret values". Q7: the `stream` and `s3-storage` READMEs give the recording pattern that plays (public-read prefix). Q8: `core`'s `hasCode` (an `exports` entry) is the one "has code" rule; `check:items` refuses `src/` without `exports` |
| Release pipeline                       | ✅ `release.yml` (Changesets, npm trusted publishing, provenance) exists and runs only by hand. ✅ Trusted publishing is set for `runtime`, `core`, `s3-storage` and `stream` (2026-11-02); proven by the first workflow release, `runtime` and `core` 0.1.1 (2026-11-02). ✅ Safe to run: every non-private package is on npm                                                                                                                     |
| CLI `integration:add`, `task:validate` | ⏳ Written in the ignitify CLI, not released. It can now depend on `core` `^0.1.0`                                                                                                                                                                                                                                                                                                                                                                 |
| Guide                                  | ✅ Three chapters: inbound and webhooks, use an integration, combine integrations ([docs/guide](../../../../../docs/guide/README.md)). The platform basics are in the platform's own docs                                                                                                                                                                                                                                                          |
| Nightly sandbox job                    | ✅ `nightly.yml` runs the suite by hand. Its schedule stays off: the sandbox keys are rejected (closed, §4.1)                                                                                                                                                                                                                                                                                                                                      |
| npm org and GitHub repo                | ✅ The npm org `@ignitify-integrations` and the GitHub repo `ignitify-dev/ignitify-integrations` exist. `runtime`, `core`, `s3-storage` and `stream` 0.1.0 are published. Each published package also lists a `0.0.0-stage` version that npm made before the first publish; it is deprecated ("not a release")                                                                                                                                     |

**Verified:** a clean install of `core` from npm in an empty folder runs `parseManifest`, `planAdd` and `planHeadline` (2026-11-02).

**Not verified:** a publish from CI (with provenance), an integration inside a real ignitify task.

## 3. Moved out (2026-11-02)

| Was                                                              | Now                                                                  |
| :--------------------------------------------------------------- | :------------------------------------------------------------------- |
| §3 The manifest, §4 Writing an integration                       | [docs/handbook.md](../../../../../docs/handbook.md) §1 and §2        |
| §5.1 Publishing and trust, §5.2 Release and deprecation          | [docs/handbook.md](../../../../../docs/handbook.md) §3               |
| §5.3 `core` and its clients                                      | [docs/handbook.md](../../../../../docs/handbook.md) §4               |
| §5.7 How the store grows, draft upgrades, the draft known issues | [ADR-0003](../../ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md) |

## 4. Done

### 4.1 Repo setup

Done (2026-11-02): the workflows, CODEOWNERS (each released integration has its own line; drafts share one), and the issue and pull-request templates are in `.github/`.

Done in the GitHub settings (2026-11-02): the repo is public; a `master` ruleset requires the checks `check` and `DCO` (each tied to its app) and blocks force-push and deletion (repo admins may bypass it); the `ignitify-dev/maintainers` team has Maintain access, so CODEOWNERS is valid; the DCO app is installed; Actions may create pull requests (for the Changesets "version packages" pull request); the `sandbox` environment exists and only `master` may use it; secret scanning, push protection and Dependabot alerts are on.

The owner is the only maintainer and the security contact: GitHub private vulnerability reporting is on (2026-11-02), as SECURITY.md says.

Closed (rejected by the owner, 2026-11-02):

- S3 sandbox keys and the nightly schedule. For the future: to reopen it, make a small test bucket, put its endpoint, keys and bucket name in the `sandbox` environment (`S3_SANDBOX_*`), and add the schedule back to `nightly.yml`.
- A second maintainer and required approvals. For the future: add them to the `maintainers` team, update GOVERNANCE.md, then require one approval on pull requests.

### 4.2 Licence

Decided and done (the owner, 2026-11-02): every package and file is Apache-2.0, used as written, so no counsel review is needed. There is no licence-check pipeline (no REUSE, no dependency allow-list); a reviewer checks a new dependency's licence by hand. This replaces the MIT-0 part of ADR-0001 §10: example code in the READMEs is Apache-2.0 too.

### 4.3 The guide

Done (the owner, 2026-11-02): the guide has three chapters, on what the store adds: inbound and webhooks, use an integration, combine integrations. The integration READMEs link the first. The platform basics (first task, secrets, network, progress, presets, testing, limits) are not repeated here: the guide links to the platform's own docs.

### 4.4 Publishing

`runtime`, `core`, `s3-storage` and `stream` 0.1.0 were published by hand, each with trusted publishing set. `runtime` and `core` 0.1.1 (the platform limits: secret names up to 64 characters, at most 32 inbound routes of up to 256 characters) were the first release through the workflow, with provenance (2026-11-02). The 0.1.0 versions are deprecated.

## 5. Left on the client side (not this repo)

The ignitify CLI uses `core` ^0.1.1 and `hasCode`, and tests the 10 platform facts listed in [docs/handbook.md](../../../../../docs/handbook.md) §4, including `core`'s copy of the preset list (Q9).
