# telegram: upgrade checklist

This integration is a **draft**: it is in the repo but never published, and `check:items` skips its publish rules. It is being upgraded from settings only to code, by the plan in [PLAN-telegram-v1](../../artifacts/ignitify-integrations/engineer/PLAN-telegram-v1.md) and [ADR-0003](../../artifacts/ignitify-integrations/architect/ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md). Delete this file at release.

- [x] **Value test.** Code. A tenant no longer builds the code that keeps a bot safe and alive inside a run: token-safe errors, 429 waits, no duplicate sends, stop on cancel, a poll loop, long-text splitting and scratch-disk files. Every Bot API method is one typed `call`.
- [x] **Hosts.** `api.telegram.org`, for the Bot API and the file links.
- [x] **Secrets.** `TELEGRAM_BOT_TOKEN`.
- [x] **Bot API facts.** Checked; see the plan, §9.
- [x] **Code and tests.** The core (PR 2) and polling (PR 3), with unit, fake-server and manifest tests.
- [ ] **README.** Rewritten for code (PR 3). Open: the live test (`test/live.test.ts`) run once by hand, with its output in the PR. It sends long text, uploads and downloads a file, and cleans up. Also check by hand the test-environment paths (`/bot<token>/test/…`, `/file/bot<token>/test/…`) and `sendVideo` with a `thumbnail` from disk.
- [ ] **Owner.** `/integrations/telegram/` in `.github/CODEOWNERS`.
- [ ] **Release.** Remove `"private": true`, add `publishConfig` and the `repository` field, set `version` to `0.1.0`, publish it once by hand, deprecate npm's `0.0.0-stage`, set trusted publishing with **Allow `npm publish`**, and delete this file.
