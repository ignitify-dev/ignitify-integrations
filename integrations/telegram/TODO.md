# telegram: upgrade checklist

This integration is a **draft**: it is in the repo but never published, and `check:items` skips its publish rules. It was built as a real integration and then held back (the owner, 2026-11-02), so only the release is left. Follow [ADR-0003](../../artifacts/ignitify-integrations/architect/ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md) when it is upgraded, then delete this file.

- [x] **Value test.** Settings only: the bot token secret and the Bot API host.
- [x] **Hosts.** `api.telegram.org`.
- [x] **Secrets.** `TELEGRAM_BOT_TOKEN`.
- [x] **README.** `Add it`, `Use it`, `Grow your task`, `Limits`.
- [ ] **Owner.** A named owner for `/integrations/telegram/` in `.github/CODEOWNERS`.
- [ ] **Release.** Remove `"private": true`, add `publishConfig`, set `version` to `0.1.0`, publish it once by hand, deprecate npm's `0.0.0-stage`, set trusted publishing, and delete this file.
