# Governance

## Roles

- **Maintainers** merge pull requests, cut releases and decide on new integrations. At least two maintainers exist at all times.
- **Integration owners** are named per integration folder in [CODEOWNERS](.github/CODEOWNERS). They review changes to their integration and answer its issues.

## How an integration is accepted

All of these must hold:

1. **Value test.** The issue says what a tenant no longer needs to build or run.
2. **Code only when needed.** Settings only by default. Code only for work the vendor SDK does not do in that runtime.
3. **Licence.** The integration is Apache-2.0. Linked dependencies pass the licence check.
4. **System packages.** A tool in `system_packages` runs unmodified, as a separate process, and has an OSI licence. AGPL tools are not accepted. The README records the tool's licence. The integration has a test with the real tool, skipped when it is not installed.
5. **Tests.** Decisions are unit-tested; code that talks to a service has a contract test against a real server where one runs locally.
6. **Owner.** A named owner in CODEOWNERS.
7. **README.** Short, and about the integration: `Add it`, `Use it`, `Grow your task`, `Limits`. It does not teach the vendor's API; for vendor setup it gives one line and a link to the vendor's docs.

## Drafts

A draft is an integration folder that is never published: `"private": true` and version `0.0.0` in `package.json`, and an upgrade checklist in `TODO.md`. `check:items` checks its manifest and README; npm and Changesets skip it. A draft is upgraded one at a time; the acceptance rules above apply then, starting with the value test.

## Versioning

| Change                                                                                                                        | Bump  |
| :---------------------------------------------------------------------------------------------------------------------------- | :---- |
| Existing tasks must follow it in `task.yaml`: a new secret, a new host, a new system package, a higher network type or preset | major |
| Added code, a changed `egress_hint`                                                                                           | minor |
| A fix                                                                                                                         | patch |

While an integration is 0.x, the same rule applies one level down: a change that tasks must follow is a minor.

**Only the latest version is supported.** `master` holds the latest source only.

- Right after each release, a maintainer marks every older version obsolete:
  `npm deprecate @ignitify-integrations/<name>@"<NEW" "obsolete: use NEW"`
- The git tag `@ignitify-integrations/<name>@<version>` and its GitHub release are the archive of an old version.
- We never fix, backport or answer issues for an obsolete version. npm keeps old tarballs, so old lockfiles still install them, with a warning.

## Nightly job and deprecation

The nightly job ([nightly.yml](.github/workflows/nightly.yml)) runs the full test suite on `master`, with the `s3-storage` contract test against an S3 sandbox bucket. It finds what breaks with no change in this repo: a vendor API or a tool on the test machine. Its schedule is off until the `sandbox` environment has its keys; until then it runs only by hand. Other integrations have no sandbox test yet.

An integration that is broken for 14 days, or whose vendor API is gone, is marked with `npm deprecate` in all its versions. It stays on npm, so existing lockfiles still work. It is never unpublished.

Community integrations (maintained by their contributors) are accepted only after these rules have worked for our own.

## Decisions

Maintainers decide by consensus in the pull request or issue. A change to these rules, the manifest schema or the licence needs every maintainer's approval.
