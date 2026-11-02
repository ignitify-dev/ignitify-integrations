# snowflake: upgrade checklist

This integration is a **draft**: it is in the repo but never published, and `check:items` skips its publish rules. Upgrade it when every box is ticked, then delete this file.

- [ ] **Value test.** What does the tenant no longer build or run? Settings only, or code? Candidate value: key-pair JWT auth and polling of long statements are the code candidates.
- [ ] **Hosts.** Check every host in `integration.yaml` against the vendor API docs. A host that varies per tenant goes in `network.egress_hint`. Verify host: programmatic access token header; key-pair JWT as the alternative.
- [ ] **Secrets.** Check the secret names against the vendor auth docs.
- [ ] **README.** Run the `Use it` example in a real task, and check the `Limits`.
- [ ] **Tests.** Contract test plan: write and delete one row in a test project, skipped when not set.
- [ ] **Owner.** A named owner for `/integrations/snowflake/` in `.github/CODEOWNERS`.
- [ ] **Release.** Remove `"private": true`, add `publishConfig` and the `repository` field, set `version` to `0.1.0` (the first publish is by hand), and delete this file.
