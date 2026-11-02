# Changesets

Every pull request that changes a published package adds a changeset: `npx changeset`.
A package that is not on npm yet needs no changeset: its first version is the one in its `package.json`.
A maintainer runs the release workflow by hand (`.github/workflows/release.yml`; see the [handbook](../docs/handbook.md#3-publish-and-release)).
