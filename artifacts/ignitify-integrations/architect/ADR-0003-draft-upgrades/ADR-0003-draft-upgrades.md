# ADR-0003 — Draft upgrades

> |             |                                                                                                         |
> | :---------- | :------------------------------------------------------------------------------------------------------ |
> | **Status**  | Accepted (the owner, 2026-11-02). Moved here from ADR-0002 §5.7 and §7                                  |
> | **Scope**   | How a draft integration becomes a published one, and the known issues of the drafts                     |
> | **Related** | [ADR-0002](../ADR-0002-integration-store-open-work/ADR-0002-integration-store-open-work.md) §4 and §5.1 |
> | **Public**  | This repo is public. Write nothing about the platform's internals here                                  |

## 1. Context

A draft is an integration folder that is never published: `"private": true` and version `0.0.0` in `package.json`, and an upgrade checklist in `TODO.md` (GOVERNANCE.md, "Drafts"). There are 101 drafts: 100 settings-only skeletons, and `telegram`, which was built as a real integration and then held back (the owner, 2026-11-02).

## 2. Decision

- A draft is upgraded **only when a user asks for it**, one at a time. Nobody upgrades drafts in bulk.
- Each upgrade passes the acceptance rules in GOVERNANCE.md, starting with the value test.
- Each upgrade is checked against the vendor's own docs. Nothing in a draft is trusted until then.

## 3. How to upgrade a draft

Work through the draft's `TODO.md`:

1. **Value test.** Write what the tenant no longer builds or runs. Settings only, or code? Code only for work the vendor SDK does not do.
2. **Hosts.** Check every host in `integration.yaml` against the vendor's API docs. A host that varies per tenant goes in `network.egress_hint`.
3. **Secrets.** Check the secret names against the vendor's auth docs.
4. **README.** Run the `Use it` example in a real task, and check the `Limits`.
5. **Tests.** Code gets unit tests and, where a server runs locally, a contract test.
6. **Owner.** Add a line for `/integrations/<name>/` to `.github/CODEOWNERS`.
7. **Release.**
   - In `package.json`: remove `"private": true`, add `publishConfig` (`access: public`, `provenance: true`) and the `repository` field, and set `version` to `0.1.0`.
   - Set the status in the [index](../../../../integrations/README.md) and remove the README's draft line.
   - Delete `TODO.md`, run `npm run check`, and merge.
   - Publish the first version once by hand (`npm publish --provenance=false` in the folder, with 2FA). npm also lists a `0.0.0-stage` version; deprecate it: `npm deprecate "@ignitify-integrations/<name>@0.0.0-stage" "not a release: use 0.1.0 or later"`.
   - On the package's npm settings page, set trusted publishing: GitHub Actions, `ignitify-dev/ignitify-integrations`, `release.yml`. From then on, only the release workflow publishes it.

## 4. Known issues of the drafts

| Issue                                                                                   | Fix                       |
| :-------------------------------------------------------------------------------------- | :------------------------ |
| 34 drafts say "Verify host": their hosts are not checked against vendor docs            | Step 2, at upgrade        |
| Secret names are not checked against vendor docs; one Google key has three secret names | Step 3, at upgrade        |
| `telegram`: steps 1–4 are done; only the owner line and the release are left            | Steps 6 and 7, at upgrade |
