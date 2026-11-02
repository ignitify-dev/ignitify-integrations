# Security policy

## Report a vulnerability

Do **not** open a public issue. Use GitHub's private vulnerability reporting: **Security → Report a vulnerability** on this repository.

We answer within 3 working days and agree on a disclosure date with you.

## What is in scope

- Code in this repository and the packages published from it under `@ignitify-integrations/*`.
- The release process.
- The manifests (a manifest that makes the CLI add a host or secret it should not).

The ignitify platform itself is out of scope here; report those issues through the security contact on ignitify.dev.

## What integration code can do

Integration code runs in the tenant's VM with all of the task's secrets and hosts. Review it as you review any dependency.

## How releases are protected

- Release automation is not set up yet. The plan: CI publishes with npm trusted publishing (OIDC) and provenance, and no npm token exists. The first version of each package is published once by hand, because npm needs the package before trusted publishing can be set.
- No package has install scripts.
- New dependency versions are taken only after a waiting period (Renovate `minimumReleaseAge`).
