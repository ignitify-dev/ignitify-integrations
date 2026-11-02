# telegram: upgrade checklist

This integration is a **draft**: it is in the repo but never published, and `check:items` skips its publish rules. It is being upgraded from settings only to code, by the plan in [PLAN-telegram-v1](../../artifacts/ignitify-integrations/engineer/PLAN-telegram-v1.md) and [ADR-0003](../../artifacts/ignitify-integrations/architect/ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md). Delete this file at release.

- [x] **Value test.** Code. A tenant no longer builds the code that keeps a bot safe and alive inside a run: token-safe errors, 429 waits, no duplicate sends, stop on cancel, a poll loop, long-text splitting and scratch-disk files. Every Bot API method is one typed `call`.
- [x] **Hosts.** `api.telegram.org`, for the Bot API and the file links.
- [x] **Secrets.** `TELEGRAM_BOT_TOKEN`.
- [x] **Bot API facts.** Checked; see the plan, §9.
- [ ] **Code and tests.** PR 2 (core) and PR 3 (polling), with unit and fake-server tests.
- [ ] **README.** Rewritten for code, then the `Use it` example run in a real task (the live test, PR 3).
- [ ] **Owner.** `/integrations/telegram/` in `.github/CODEOWNERS`.
- [ ] **Release.** Remove `"private": true`, add `publishConfig` and the `repository` field, set `version` to `0.1.0`, publish it once by hand, deprecate npm's `0.0.0-stage`, set trusted publishing with **Allow `npm publish`**, and delete this file.
