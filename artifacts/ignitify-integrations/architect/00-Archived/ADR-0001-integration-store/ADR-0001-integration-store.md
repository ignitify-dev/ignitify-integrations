# ADR-0001 — The integration store

> |                  |                                                                                                                                                                                                                                                         |
> | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | **Status**       | Accepted (2026-10-31). Built in this repo. Archived (2026-11-02): this file keeps only what is done. The work not done yet and the open questions are in [ADR-0002](../../ADR-0002-integration-store-open-work/ADR-0002-integration-store-open-work.md) |
> | **Scope**        | What an integration is, what its manifest holds, the rules `core` applies to `task.yaml`, versioning, trust, and how this repo works                                                                                                                    |
> | **Not in scope** | The ignitify CLI commands that use `core` (`integration:add`, `task:validate`) and the platform itself. They are decided on the platform side                                                                                                           |

## 1. Context

A tenant can already add any library to an ignitify task and call any API. An import is easy. The hard work is around the call: the secret names, the egress hosts, the network type, the system packages, the preset, and the plumbing that every task of one type repeats. Each of these settings lives in `task.yaml`. A tenant who forgets one gets a refused deploy or a blocked connection.

This repo removes that work, one integration at a time.

## 2. Decision

1. **One concept.** An integration is one npm package, `@ignitify-integrations/<name>`, with an `integration.yaml` inside. The code is optional.
2. **Value test.** An integration ships only if we can answer: _what does the tenant no longer build or run?_ "They skip `npm install`" is not enough.
3. **npm is the index.** We run no index, no hash list and no deprecation list.
4. **`core` holds the rules.** The schema, the checks, and the pure functions `planAdd`, `planHeadline` and `checkCoverage`.
5. **v1 is good enough; each version must earn its place** (§9).

Not done yet (provenance, the lockfile pin, `npm deprecate`, a client that copies no rule): see ADR-0002.

## 3. The one concept

| Part                          | Rule                                                                                                                                             |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| npm name                      | `@ignitify-integrations/<name>`. One helper builds it (`packageName(name)`)                                                                      |
| Folder                        | `integrations/<name>/`                                                                                                                           |
| `integration.yaml`            | What the integration needs from `task.yaml` (§4). It is in the package's published `files`                                                       |
| Code                          | Optional. Without code, the integration is **settings only**. The README then shows a short example with a common library and with plain `fetch` |
| Version, description, licence | In `package.json` only. One source for each                                                                                                      |
| `README.md`                   | Required, short, about **the integration** (§3.1)                                                                                                |

"Kit" is an informal word in contributor docs for an integration whose manifest has `system_packages`. It is not a field and not a folder.

### 3.1 The README

Sections, in this order. `check:items` refuses a README without them, and needs the title to be `# <name>` followed by one line of text.

| Section               | Holds                                                                  |
| :-------------------- | :--------------------------------------------------------------------- |
| `# <name>` + one line | What the integration does for a task                                   |
| `## Add it`           | The add command, the secrets to set, and what "you add" means here     |
| `## Use it`           | The smallest working task code                                         |
| `## Grow your task`   | Options, patterns, other integrations it combines with, guide chapters |
| `## Limits`           | What it cannot do today, and why                                       |

The README does not teach the vendor's API. For vendor setup (a bot, a bucket, a key) it gives one line and a link to the vendor's docs.

## 4. The manifest (`integration.yaml`, schema v1)

| Field                                                              | Required       | Meaning                                                                                                                                                                     |
| :----------------------------------------------------------------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema_version`                                                   | yes            | `1`                                                                                                                                                                         |
| `name`                                                             | yes            | Equals the folder name                                                                                                                                                      |
| `runtimes`                                                         | yes            | `[node]`                                                                                                                                                                    |
| `secrets`                                                          | no             | Default secret names the code reads from `ctx.secrets`                                                                                                                      |
| `network.type`                                                     | with `network` | `none`, `egress` or `bidirectional`                                                                                                                                         |
| `network.egress_allow`                                             | no             | A **fixed** host list, at most 32, lower case, no IP, **no wildcard**. A package must never ask for a whole domain, because a plan can be applied with no person reading it |
| `network.egress_hint`                                              | no             | One short line for hosts that vary per tenant (a bucket host, a source host). The plan prints it under "you add"                                                            |
| `network.inbound_port`, `inbound_routes`, `inbound_max_concurrent` | no             | For `bidirectional` only. A route at or under `/__callback/` (reserved by the platform) is refused                                                                          |
| `execution`                                                        | no             | `duration`, `interaction`                                                                                                                                                   |
| `system_packages`                                                  | no             | OS packages the code runs as separate processes (`ffmpeg`)                                                                                                                  |
| `min_preset`                                                       | no             | The smallest preset that works                                                                                                                                              |

There are no params, no host templates and no aliases. A package takes credentials in code: default secret names, plus an optional `credentials` option for a second account.

## 5. The rules `core` applies

**`planAdd(config, manifest)`** returns the new `task.yaml` content, notes and "you add" lines, or the reasons it refuses:

| Case                                                                   | Rule                                                                        |
| :--------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| Secrets, egress hosts, system packages                                 | Union. The tenant's own entries stay first                                  |
| Network type, preset                                                   | Only raised, never lowered. An unknown preset is left as it is, with a note |
| An `execution` or inbound field the task sets to a **different** value | Refused, naming the field. There is no force option                         |
| A network is present and `egress_allow` is absent (any host)           | Left absent, with a note. A list would narrow egress                        |
| No network                                                             | `egress_allow` becomes exactly the integration's hosts (fail-closed)        |
| The host union passes 32 (the platform limit)                          | Refused. `core` holds a copy of the limit (`EGRESS_ALLOW_MAX`)              |

Adding the same integration again gives the same result. Removal is `npm uninstall`; left-over settings are the tenant's to delete.

Not done yet (a client test that the copy of the limit equals the platform constant): see ADR-0002.

**`planHeadline(manifest, version, hasCode)`** gives line 1 of a plan, for example `@ignitify-integrations/stream@0.1.0 · settings + code · runs ffmpeg`.

**`checkCoverage(config, manifests)`** lists each thing `task.yaml` no longer covers: a missing secret or host, a lower network type or preset, a different execution or inbound field, a missing route or system package. It cannot check hosts in `egress_hint`.

## 6. The first three integrations

|                       | `telegram`                                | `s3-storage`                                                                                  | `stream`                                                                                                       |
| :-------------------- | :---------------------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| Has                   | settings only                             | settings + code                                                                               | settings + code + `system_packages: [ffmpeg]`                                                                  |
| The tenant no longer… | looks up the secret name and the API host | writes upload, presigned-link and download code; looks for a way past the 10 KiB result limit | writes ~290 lines of plumbing: an HTTP server, a player page, the viewer link, ffmpeg progress, stop on cancel |
| Network               | egress, fixed host `api.telegram.org`     | egress, no fixed host; hint: the bucket host                                                  | bidirectional; hint: the source host                                                                           |
| Secrets               | `TELEGRAM_BOT_TOKEN`                      | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                                                    | none                                                                                                           |

`stream` serves HLS over HTTPS only and cannot take an ingest stream (RTMP, SRT, WebRTC), because task inbound is HTTPS only.

The repo also holds **draft** integrations: `"private": true`, version `0.0.0`, a `TODO.md` upgrade checklist. A draft is never versioned or published. `check:items` checks its manifest and README.

Not done yet (the draft rule in GOVERNANCE.md): see ADR-0002.

## 7. Versioning

| Change                                                                                                                        | Bump  |
| :---------------------------------------------------------------------------------------------------------------------------- | :---- |
| Existing tasks must follow it in `task.yaml`: a new secret, a new host, a new system package, a higher network type or preset | major |
| Added code, a changed hint                                                                                                    | minor |
| A fix                                                                                                                         | patch |

While an integration is 0.x, the same rule applies one level down (major → minor).

**Only the latest version is supported.** `master` holds the latest source only.

Not done yet (the release and deprecation steps): see ADR-0002.

## 8. Security and trust

- Integration code runs in the tenant's VM with all of that task's secrets and hosts. The platform never runs it.
- No package has install scripts (`check:items`).
- Linked dependencies must have a permissive licence (`check:licences`). A tool in `system_packages` runs unmodified as a separate process, has an OSI licence, and is not AGPL. An integration with `system_packages` has a test with the real tool.

Not done yet (publishing): see ADR-0002.

## 9. How the store grows

**Principle: v1 is good enough; each version must earn its place.**

| Version        | The tenant gets                                     | Needs       | Not yet                                      |
| :------------- | :-------------------------------------------------- | :---------- | :------------------------------------------- |
| **v1** (built) | One concept, three integrations, `core` for the CLI | nothing new | an index, aliases, params, a removal command |

Not done yet (v2 and later): see ADR-0002.

## 10. Repo, licence and the guide

- One public repo; npm workspaces; shared packages `core` (schema and pure planning logic) and `runtime` (zero-dependency run-time helpers).
- Apache-2.0 for code (the owner's decision, 2026-11-02). Integration READMEs and the guide are MIT-0 (`REUSE.toml`), so a tenant can copy the examples.
- The guide (`docs/guide/`) replaces recipes: how to build tasks and use integrations for complex tasks. The outline is written.

Not done yet (DCO, the counsel review, CODEOWNERS, the guide chapters): see ADR-0002.

## 11. Resolved questions

| #   | Question                                 | Answer                                                                                                                            |
| :-- | :--------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Reserve the npm scope and the GitHub org | Done: the npm org `@ignitify-integrations` and the GitHub repo `ignitify-dev/ignitify-integrations` exist (the owner, 2026-11-02) |
| Q2  | Apache-2.0 or MIT                        | Apache-2.0 (the owner's decision, 2026-11-02)                                                                                     |
| Q3  | Community integrations                   | Not until the review rules have worked for our own (the owner, 2026-11-02). GOVERNANCE.md states it                               |

Q4 and Q5 are decided but not done yet: see ADR-0002.

## 12. Rejected options

| Option                                                        | Why not                                                                                  |
| :------------------------------------------------------------ | :--------------------------------------------------------------------------------------- |
| Kinds (recipe, package, kit)                                  | Three words for one thing; the manifest already says what an integration has             |
| A required kind flag, a kind + id key                         | Only needed because of kinds; one name for two items confused users                      |
| Aliases (prefixed secret names)                               | A second account is a `credentials` option in code                                       |
| Params and host templates                                     | Hosts that vary go in `egress_hint`; the tenant adds them                                |
| Our own index (index file, manifest hashes, deprecation list) | npm already gives names, versions, provenance and deprecation                            |
| Wrap every vendor SDK                                         | Fails the value test                                                                     |
| Several supported versions side by side                       | Each old version is one more thing to fix and test; the tenant upgrades with one command |
| A README that teaches the vendor's API                        | The vendor's docs do that better; ours shows how to build the task                       |
