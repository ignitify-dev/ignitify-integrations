# Plan — `@ignitify-integrations/telegram` v1 (draft upgrade to code)

> |            |                                                                                                                                                                     |
> | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | **Status** | Agreed (the owner, 2026-11-02): planned, debated by the engineer and the reviewer, every point settled                                                              |
> | **Goal**   | A solid package that supports most of what a Telegram bot can do, inside an ignitify task                                                                           |
> | **Rules**  | [docs/handbook.md](../../../docs/handbook.md), [GOVERNANCE.md](../../../GOVERNANCE.md), [ADR-0003](../architect/ADR-0003-draft-upgrades/ADR-0003-draft-upgrades.md) |
> | **Public** | This repo is public. Write nothing about the platform's internals here                                                                                              |

## 1. Value test

For a task that sends one message, a vendor SDK or plain `fetch` is enough. The package earns its code (GOVERNANCE rule 2) through what no Telegram SDK does in this runtime:

- **The token stays secret.** It is inside every Bot API URL. Every error is built from scratch, with no `cause`, and redacted.
- **429 waits.** A 429 is retried after `parameters.retry_after`, up to a cap. A longer wait comes back as an error with `retryAfterSec`, never a hang.
- **No duplicate sends.** A 5xx or network error is retried only for safe methods (`get*`, `setWebhook`, `deleteWebhook`).
- **Cancel works.** Every call and the poll loop stop on SIGTERM/SIGINT (or a given `AbortSignal`).
- **Updates inside a run.** `updates({ mode: 'poll' })` is an async iterator, at least once.
- **Long text.** `sendText` splits plain text at Telegram's limit.
- **Files on the scratch disk.** Upload by streaming, and download with a size check, with the token hidden.

"Most actions" come from one exported, typed `call(method, params)`. It is generic, with no code per method, so it is not the "wrap every vendor SDK" option that ADR-0001 §12 rejects. A tenant can still use any SDK next to it, for example grammY's router through `bot.handleUpdate(update)`.

**Value-test sentence** (for `TODO.md` and the issue): _A tenant no longer builds the code that keeps a bot safe and alive inside a run: token-safe errors, 429 waits, no duplicate sends, stop on cancel, a poll loop, long-text splitting and scratch-disk files. Every Bot API method is one typed `call`._

## 2. Decisions

| #   | Decision                                                                                                                                                                                      | Why                                                                                                                                                            |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Transport: plain `fetch` (Node 22). Types from `@grammyjs/types` as a regular `dependency` (MIT, types only). No run-time SDK                                                                 | Zero run-time dependencies; we own the error and stop paths. The published `.d.ts` refers to the types, so tenants need the package                            |
| D2  | v1 exports exactly: `telegram`, `call`, `sendText`, `fromDisk`, `download`, `updates` (poll), `splitText`, `escapeMarkdownV2`, `escapeHtml`, and the limit constants                          | The owner asked for "most actions". Any later single-method helper needs its own value-test line in its PR                                                     |
| D3  | Webhook mode is v1.1, not v1                                                                                                                                                                  | Poll alone passes the value test. Webhook carries unproven risks: the secret header through the edge, grace time after SIGTERM, and a port clash with `stream` |
| D4  | The manifest stays `egress` + `api.telegram.org` + `TELEGRAM_BOT_TOKEN`. The plan headline becomes `settings + code`                                                                          | Send-only tasks must not get a port and a long run. Raising the network type later would be a breaking change                                                  |
| D5  | `processStop()` (from `stream`) and `redact()` (from `s3-storage`) move into `runtime` as **0.1.2** (a patch: new exports in 0.x). `stream` and `s3-storage` switch at their next real change | CONTRIBUTING: no duplicated logic. A patch forces no release of `core`, `s3-storage` or `stream`                                                               |
| D6  | Poll mode: `dropPending: false` by default. The offset is committed only when the consumer pulls the next update. HTTP 409 becomes a clear error                                              | At-least-once delivery. Only one poller per bot                                                                                                                |
| D7  | Tests: pure unit tests and a minimal fake Bot API server in CI. One manual live test before the release, skipped without env vars. No nightly test                                            | No Telegram server runs locally (GOVERNANCE rule 5); the PR says so. The sandbox item is closed                                                                |
| D8  | Every Telegram fact (limits, header names, paths) is checked against <https://core.telegram.org/bots/api> in PR 1. Its source and date go in a comment in `constants.ts`                      | Nothing in this repo states a Bot API fact                                                                                                                     |
| D9  | Not in v1: `getMe`, group-to-supergroup migration handling (the redacted error carries `migrate_to_chat_id`), per-method helpers, broadcast pacing, splitting formatted text, Mini App checks | v1 is good enough                                                                                                                                              |
| D10 | CODEOWNERS: `/integrations/telegram/` → `@ignitify-dev/maintainers`                                                                                                                           | ADR-0003 step 6                                                                                                                                                |

## 3. Design

### 3.1 Files: `integrations/telegram/src/`

Pure modules decide; shell modules do I/O. Effects are injected.

| File           | Kind  | Holds                                                                                                                                                                  |
| :------------- | :---- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants.ts` | —     | Names, limits (each with its Bot API source), messages                                                                                                                 |
| `types.ts`     | —     | `Method`, `Params<M>`, `Returns<M>` from `@grammyjs/types`; `TelegramError`, options                                                                                   |
| `config.ts`    | pure  | `parseOptions`; `checkToken` (non-empty, no `/`, no whitespace); `apiBase(root, environment)`; `http` root allowed for loopback only                                   |
| `text.ts`      | pure  | `splitText` (paragraph → line → space → hard cut, never inside a surrogate pair), `escapeMarkdownV2`, `escapeHtml`, `checkLength` (plain text and plain captions only) |
| `encode.ts`    | pure  | `encodeParams` → JSON, or multipart with a file list. A `DiskFile` inside `media[]` becomes `attach://fN`                                                              |
| `response.ts`  | pure  | `parseResponse` → `Result`; `retryDecision(attempt, error, method, limits)`                                                                                            |
| `poll.ts`      | pure  | `nextOffset`, `pollBackoffMs`                                                                                                                                          |
| `client.ts`    | shell | `call`: fetch, timeout, abort, the retry loop with an injected `sleep`                                                                                                 |
| `files.ts`     | shell | `fromDisk` (`fs.openAsBlob`, never read into memory), `download` (stat check, stream to disk)                                                                          |
| `updates.ts`   | shell | The poll loop, `ctx.chunk` progress (counts only, throttled), `ctx.metric`, stop                                                                                       |
| `telegram.ts`  | shell | `telegram(ctx, options, deps)` builds the object                                                                                                                       |
| `index.ts`     | —     | Public exports only (D2)                                                                                                                                               |

`redact` and `processStop` come from `@ignitify-integrations/runtime` 0.1.2 (D5).

### 3.2 Public API

```ts
export function telegram(ctx: TaskCtx, options?: TelegramOptions, deps?: Partial<TelegramDeps>): Telegram;

export interface TelegramOptions {
  readonly token?: string; // a second bot; default ctx.secrets.TELEGRAM_BOT_TOKEN
  readonly environment?: 'prod' | 'test'; // 'test' = Telegram's test environment
  readonly apiRoot?: string; // tests only; http only for loopback
  readonly retryMax?: number;
  readonly retryWaitMaxSec?: number;
}

export interface TelegramDeps {
  readonly fetch: typeof fetch;
  readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  readonly now: () => number;
}

export interface Telegram {
  call<M extends Method>(
    method: M,
    params: Params<M>,
    opts?: { signal?: AbortSignal },
  ): Promise<Result<Returns<M>, TelegramError>>;
  sendText(
    chatId: number | string,
    text: string,
    opts?: SendTextOptions,
  ): Promise<Result<readonly Message.TextMessage[], TelegramError>>;
  download(
    fileId: string,
    toPath: string,
    opts?: { signal?: AbortSignal },
  ): Promise<Result<{ path: string; size: number }, TelegramError>>;
  updates(opts: {
    mode: 'poll';
    allowedUpdates?: readonly string[];
    dropPending?: boolean;
    signal?: AbortSignal;
  }): AsyncIterable<Update>;
}

export type TelegramError = {
  readonly kind: 'api' | 'network' | 'timeout' | 'aborted' | 'invalid';
  readonly method: string;
  readonly message: string; // one line, redacted
  readonly status?: number;
  readonly errorCode?: number;
  readonly description?: string;
  readonly retryAfterSec?: number; // a 429 we did not wait for
  readonly migrateToChatId?: number;
  readonly partsSent?: number; // sendText only
};

export const fromDisk: (path: string, filename?: string) => DiskFile;
```

- **Setup errors throw.** Bad options and a missing token throw, with the `readSecret` message, as `storage()` does.
- **API failures return a `Result`.** The `updates` iterator is the one exception: it throws an already-redacted `Error` on 401, on 409, or on abort during setup.

### 3.3 Behaviour

- **`call`:**
  1. Encode the params: JSON, or multipart when a `DiskFile` is present.
  2. `checkLength` checks plain text and plain captions only.
  3. `POST {apiBase}/bot{token}/{method}`, with `AbortSignal.any([signal, timeout])`.
  4. `parseResponse` turns the reply into a `Result`.
  5. `retryDecision` decides whether to retry (§1).
  6. Each error message is method + status + description, passed through `redact`.
- **`sendText`:**
  - Without `parse_mode`: it splits the text and sends the parts in order. `reply_markup` goes on the last part only.
  - With `parse_mode`: it makes one call.
  - A failed part returns `partsSent`.
- **`download`:** `getFile`, then a check that `file_size` is at most the limit (otherwise an `invalid` error with no GET). Then GET the file path under the same host, and stream it to `toPath`.
- **`updates` (poll):**
  1. Loop on `getUpdates` with an offset, a timeout and a limit.
  2. Yield updates one by one, and commit the offset on the next pull.
  3. Network errors and 5xx back off. A 401 or 409 throws.
  4. Send one `listening` chunk, then a throttled `receiving` count.
  5. The default stop is SIGTERM/SIGINT, released in `finally`.

## 4. Manifest and README

- **Manifest:** unchanged (D4). `test/manifest.test.ts` checks that the egress host equals `API_HOST`, and that the secrets equal `[SECRET_BOT_TOKEN]`.
- **README:** `Add it`, `Use it`, `Grow your task`, `Limits`. It claims only what the tests prove.
  - **Add it:** `integration:add`, `secret:set`, and one line plus a link for creating a bot.
  - **Use it:** a send-only example, a table of the calls, and a poll-bot example (long run: `execution.duration: long`, and `interaction: continuous` for progress).
  - **Grow your task:** files with `fromDisk`; a file too large goes through `s3-storage` as a link; escaping; a second bot; grammY's router through `handleUpdate`; announcing a `stream` link.
  - **Limits:**
    - one poller per bot (409);
    - `getUpdates` fails while a webhook is set;
    - downloads up to the Bot API limit;
    - formatted text is not split;
    - 429 waits are capped;
    - webhook mode comes in v1.1;
    - no run is started by a message yet.
- **Index row** (`integrations/README.md`) and the root README table: back as `settings + code` at release.

## 5. Tests

- **Unit (pure):**
  - `text`: the limit, break preference, the hard cut, surrogate pairs, empty text, escape sets, caption check.
  - `config`: missing token message, bad token, loopback-only `http`, test environment path, redaction.
  - `encode`: JSON, multipart, `attach://` for albums, undefined dropped.
  - `response`: `ok`, error mapping including `retry_after` and `migrate_to_chat_id`, a non-JSON body.
  - `retryDecision`: 429 under the cap, 429 over the cap, no retry of a send on 5xx, retry of `getUpdates`, `retryMax`.
  - `poll`: the offset, backoff.
  - `manifest`.
- **Fake Bot API (CI):** a `node:http` server on `127.0.0.1:0`, recording requests and answering from a script. Cases:
  - JSON call; a 429 then success (fake clock); dropped connection with no token in the message; abort.
  - `sendText` of 9000 characters makes 3 calls in order; document upload byte-equal; album with `attach://`.
  - `download` refuses an oversize file with no GET; `download` streams the bytes.
  - Poll yields in order with `offset = last + 1`; poll stops on abort; 409 is a clear error.
  - No token in any error or console output.
- **Live (manual, skipped without `TELEGRAM_LIVE_TOKEN` and `TELEGRAM_LIVE_CHAT_ID`):** `sendText` (2 parts), then `fromDisk` document, then `download` equal bytes, then clean-up. It runs once before the release, and its output goes in the PR.

## 6. Delivery: 4 pull requests

Telegram stays a draft (`private`, `0.0.0`) until PR 4. A draft with `src/` needs `exports` (`check:items`).

| PR  | Content                                                                                                                                                                                                                                                                                                    | Done when                                                          |
| :-- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| 1   | This plan; the value test in `TODO.md` and ADR-0003 §4; Bot API facts checked (D8); `runtime` 0.1.2 with `redact` and `processStop` (+ tests, changeset)                                                                                                                                                   | `npm run check` green; runtime 0.1.2 released through the workflow |
| 2   | Core: `package.json` (`exports`, `files`, deps), `tsconfig.json`, root `tsconfig` reference; `constants`, `types`, `config`, `text`, `encode`, `response`, `client`, `files`, `telegram`, `index`; unit and fake-server tests                                                                              | All tests green; no token in any output                            |
| 3   | `poll.ts`, `updates.ts` and tests; README rewrite; `manifest.test.ts`; `live.test.ts` (skipped); live run once by hand                                                                                                                                                                                     | `check:items` README check green; live output in the PR            |
| 4   | Release (ADR-0003 step 6–7): CODEOWNERS line; `package.json` without `private`, with `publishConfig`, version `0.1.0`; index and README status; delete `TODO.md`. Then the first publish by hand and trusted publishing with **Allow `npm publish`** ([handbook §3.1](../../../docs/handbook.md#31-trust)) | `npm view` shows 0.1.0 with `dist/`, `LICENSE` and `NOTICE`        |

Each PR: the engineer plans, the reviewer reviews the plan and then the diff (at most one re-review), commits are signed off, and `check` and `DCO` must pass.

## 7. Risks

- **A reviewer says "this is an SDK".** Answer with §1; keep the exports to D2.
- **Two runs poll one bot.** That gives 409. It is documented, with no platform lock.
- **A Bot API limit changes.** It is a constant with its source, plus a test; Renovate bumps `@grammyjs/types`.

## 8. v1.1 (later): webhook mode

`updates({ mode: 'webhook' })`:

1. Listen, then `ctx.ready()`, then `setWebhook` with a random `secret_token` per run.
2. Check the header in constant time.
3. A bounded queue answers 200.
4. `deleteWebhook` on stop.

The README gives the `bidirectional` `task.yaml` lines to add by hand. Before it ships, prove on a real task that the edge passes the secret header, and measure the grace time after SIGTERM.

## 9. Bot API facts, checked (2026-11-02)

Source: the API docs inside `@grammyjs/types` 5.0.0 (MIT, no dependencies), which mirror <https://core.telegram.org/bots/api>. That site could not be reached from the build machine, so each fact below is quoted from the package. PR 2 puts each one in `constants.ts` with this source.

| Fact                  | Value                                                                                                          | Quote                                                                                                                             |
| :-------------------- | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| Message text          | 1–4096 characters after entities parsing                                                                       | "Text of the message to be sent, 1-4096 characters after entities parsing"                                                        |
| Caption               | 0–1024 characters after entities parsing                                                                       | "Caption of the photo to be sent, 0-1024 characters after entities parsing"                                                       |
| Download              | up to 20 MB                                                                                                    | "For the moment, bots can download files of up to 20MB in size"                                                                   |
| File link             | `https://api.telegram.org/file/bot<token>/<file_path>`, valid at least 1 hour                                  | "can then be downloaded via the link https://api.telegram.org/file/bot<token>/<file_path>"                                        |
| Upload                | up to 50 MB                                                                                                    | "Bots can currently send files of any type of up to 50 MB in size"                                                                |
| Album                 | 2–10 items                                                                                                     | "An Array describing messages to be sent, must include 2-10 items"                                                                |
| `getUpdates.limit`    | 1–100, default 100                                                                                             | "Values between 1-100 are accepted. Defaults to 100."                                                                             |
| `getUpdates.timeout`  | seconds for long polling, default 0                                                                            | "Timeout in seconds for long polling. Defaults to 0"                                                                              |
| Polling vs webhook    | no `getUpdates` while a webhook is set                                                                         | "This method will not work if an outgoing webhook is set up."                                                                     |
| Error parameters      | `retry_after` (seconds to wait), `migrate_to_chat_id`                                                          | "In case of exceeding flood control, the number of seconds left to wait before the request can be repeated"                       |
| MarkdownV2 escapes    | the 18 characters `_` `*` `[` `]` `(` `)` `~` `` ` `` `>` `#` `+` `-` `=` `\|` `{` `}` `.` `!`, and `\` itself | "In all other places characters … must be escaped with the preceding character '\\'" (the full list is in the MarkdownV2 section) |
| Webhook header (v1.1) | `X-Telegram-Bot-Api-Secret-Token`; 1–256 of `A-Z a-z 0-9 _ -`                                                  | "A secret token to be sent in a header “X-Telegram-Bot-Api-Secret-Token” … 1-256 characters"                                      |

Not in that source, so it is checked in the PR 3 live run instead: the test-environment path (`/bot<token>/test/<method>`) and the HTTP status of a second poller (expected 409).
