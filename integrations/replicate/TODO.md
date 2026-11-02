# replicate: upgrade checklist

This integration is a **draft**: it is in the repo but never published, and `check:items` skips its publish rules. Upgrade it when every box is ticked, then delete this file.

- [ ] **Hosts.** Check every host in `integration.yaml` against the vendor API docs. A host that varies per tenant goes in `network.egress_hint`. Verify host: replicate.delivery (output files may also come from other delivery hosts).
- [ ] **Secrets.** Check the secret names against the vendor auth docs.
- [ ] **Value test.** Settings only, or code? Candidate value: settings only: the official SDKs already retry and stream.
- [ ] **README.** Run the `Use it` example in a real task, and check the `Limits`.
- [ ] **Tests.** Contract test plan: one short call with a cheap model, skipped when the key is not set.
- [ ] **Owner.** A named owner for `/integrations/replicate/` in `.github/CODEOWNERS`.
- [ ] **Release.** Remove `"private": true`, add `publishConfig`, set `version` to `0.1.0` (the first publish is by hand), and delete this file.
