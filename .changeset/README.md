# Changesets

Every pull request that changes a published package adds a changeset: `npx changeset`.
A package that is not on npm yet needs no changeset: its first version is the one in its `package.json`.
Release automation is not set up yet (see [ADR-0002 §5](../artifacts/ignitify-integrations/architect/ADR-0002-integration-store-open-work/ADR-0002-integration-store-open-work.md#5-decided-not-done-yet)).
