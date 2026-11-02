# Scenario — "launch event": all three integrations in one task

> **Purpose:** source material for a guide tutorial (guide chapter 7, "Combine integrations").
> **Date:** 2026-10-31 · **Store version:** all integrations 0.1.0.
> **Fidelity:** lines marked **(core)** are the real output of `planAdd`, `planHeadline` and `checkCoverage` from `@ignitify-integrations/core`, run on the real manifests. Everything else (prompts, npm lines, `deploy`, the obsolete-version warning) is the CLI **design**: `integration:add` and `task:validate` are not built yet. Re-run the core outputs before you publish a tutorial.

## Story

An existing task streams a product launch video live. It sends the viewer link to a Telegram channel before the stream starts, uploads the recording to S3 when the stream ends, and returns the recording link.

It shows every rule of `integration:add` once:

| Step | Rule shown                                                                      |
| :--- | :------------------------------------------------------------------------------ |
| 0    | The tenant's own settings exist before any integration                          |
| 1    | Fail-closed egress: a task with no network gets exactly the integration's hosts |
| 2    | A conflicting value is refused, never overwritten                               |
| 2b   | Network type and preset are only raised; lists are joined                       |
| 3    | "You add" for hosts that vary per tenant                                        |
| 3b   | Adding the same integration twice changes nothing                               |
| 5    | Three integrations used together in code                                        |
| 7    | `task:validate` catches a hand edit before deploy                               |
| 8    | An upgrade to a new major shows only the new setting                            |

## 0. The task before integrations

```yaml
schema_version: 1
slug: launch-event
runtime: node
secrets: [DB_URL] # the tenant's own
execution:
  interaction: boundary-only # the tenant's own choice
build:
  system_packages: [imagemagick] # the tenant's own
run:
  payload: {}
  preset: std.small
  timeout_sec: 7200
```

## 1. Add telegram

```text
$ ignitify integration:add telegram --task launch-event
@ignitify-integrations/telegram@0.1.0 · settings only                  (core)
  execution.network.type: none -> egress                               (core)
  + secrets: TELEGRAM_BOT_TOKEN
  + execution.network.egress_allow: api.telegram.org
you add:
  secret TELEGRAM_BOT_TOKEN: ignitify secret:set TELEGRAM_BOT_TOKEN --stdin   (core)
Apply? [y/N] y
```

The task had no network, so `egress_allow` becomes exactly `api.telegram.org`.

## 2. Add stream — refused

```text
$ ignitify integration:add stream --task launch-event
@ignitify-integrations/stream@0.1.0 · settings + code · runs ffmpeg   (core)
✗ execution.interaction is boundary-only but @ignitify-integrations/stream needs continuous:
  change it by hand or use another task                                (core)
```

Nothing is written. The tenant deletes `interaction: boundary-only` from `task.yaml` and runs the command again.

## 2b. Add stream — accepted

```text
$ ignitify integration:add stream --task launch-event
@ignitify-integrations/stream@0.1.0 · settings + code · runs ffmpeg   (core)
  execution.network.type: egress -> bidirectional                      (core)
  run.preset: std.small -> std.medium                                  (core)
  + build.system_packages: ffmpeg            (imagemagick stays)
  + execution.network: inbound_port 8080, inbound_routes /live/, inbound_max_concurrent 16
  + execution: duration long, interaction continuous
you add:
  egress host: the host of an https source (for example raw.githubusercontent.com); none for a local file   (core)
Apply? [y/N] y
```

## 3. Add s3-storage

```text
$ ignitify integration:add s3-storage --task launch-event
@ignitify-integrations/s3-storage@0.1.0 · settings + code              (core)
  + secrets: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
you add:                                                               (core)
  secret S3_ACCESS_KEY_ID: ignitify secret:set S3_ACCESS_KEY_ID --stdin
  secret S3_SECRET_ACCESS_KEY: ignitify secret:set S3_SECRET_ACCESS_KEY --stdin
  egress host: your bucket host: <bucket>.s3.<region>.amazonaws.com on AWS, or the host of your custom endpoint
Apply? [y/N] y
```

## 3b. Add telegram again

The plan has no changes, and `task.yaml` stays the same (core).

## 4. The final `task.yaml`

The tenant adds the two "you add" hosts by hand. Everything else is the core output.

```yaml
schema_version: 1
slug: launch-event
runtime: node
secrets: [DB_URL, TELEGRAM_BOT_TOKEN, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY]
execution:
  duration: long
  interaction: continuous
  network:
    type: bidirectional
    egress_allow:
      - api.telegram.org
      - media.example.com # you added: the video source
      - acme-rec.s3.eu-west-1.amazonaws.com # you added: the bucket
    inbound_port: 8080
    inbound_routes: [{ prefix: /live/ }]
    inbound_max_concurrent: 16
build:
  system_packages: [imagemagick, ffmpeg]
run:
  payload: {}
  preset: std.medium
  timeout_sec: 7200
```

`package.json` lists `@ignitify-integrations/telegram`, `@ignitify-integrations/stream`, `@ignitify-integrations/s3-storage`, and `grammy` (the Telegram library the tenant chose).

## 5. The task code

```ts
import { Api } from 'grammy';
import { stream, watchUrl } from '@ignitify-integrations/stream';
import { storage } from '@ignitify-integrations/s3-storage';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

// payload: { "channel": "@acme", "video": "https://media.example.com/launch.mp4" }
export async function run(payload, ctx) {
  const bot = new Api(ctx.secrets.TELEGRAM_BOT_TOKEN);
  await bot.sendMessage(payload.channel, `🔴 Live in 2 minutes: ${watchUrl(ctx)}`);

  const live = await stream(ctx, { source: payload.video, startDelaySec: 120, after: 'stop' });
  if (live.cancelled) return live;

  // after: 'stop' leaves the playlist and segments in $HOME/hls until the next stream starts
  const store = storage(ctx, { bucket: 'acme-rec', region: 'eu-west-1' });
  const dir = join(process.env.HOME, 'hls');
  const links = await Promise.all(
    (await readdir(dir)).map((file) => store.putAndLink(join(dir, file), { expiresSec: 7 * 86400 })),
  );
  await bot.sendMessage(payload.channel, `Recording is ready (${links.length} files)`);
  return { watch: live.watch, recording: links.find((link) => link.includes('index.m3u8')) };
}
```

**Tutorial notes:**

- `watchUrl(ctx)` was added because of this scenario: before it, task code could not get the viewer link before `stream()` returned.
- Each segment gets its own presigned link, so the uploaded playlist does not play from S3 as it is. A tutorial must either upload to a public-read prefix with fixed keys (`key: 'launch/<file>'`), or return only the segment links. Decide this before you write the tutorial.

## 6. Secrets, validate, deploy, run

```bash
ignitify secret:set TELEGRAM_BOT_TOKEN --stdin
ignitify secret:set S3_ACCESS_KEY_ID --stdin
ignitify secret:set S3_SECRET_ACCESS_KEY --stdin
ignitify task:validate          # (core) [] → all covered
ignitify deploy
ignitify run launch-event --payload '{"channel":"@acme","video":"https://media.example.com/launch.mp4"}'
```

## 7. Months later: a hand edit breaks the task

Someone deletes the secret names and lowers the preset to save money:

```text
$ ignitify task:validate                                                (core)
  @ignitify-integrations/telegram: secret TELEGRAM_BOT_TOKEN is missing from secrets
  @ignitify-integrations/stream: run.preset is std.small, needs at least std.medium
  @ignitify-integrations/s3-storage: secret S3_ACCESS_KEY_ID is missing from secrets
  @ignitify-integrations/s3-storage: secret S3_SECRET_ACCESS_KEY is missing from secrets
```

The problem shows before a deploy, not when ffmpeg runs out of memory during the event.

## 8. Upgrade: telegram 2.0 is released

Assumption for the story: telegram 2.0 adds code (for example a send rate limiter) and a new secret `TELEGRAM_WEBHOOK_SECRET`. The new secret makes it a major version (ADR-0001 §7). 1.x becomes obsolete.

```text
$ ignitify task:validate
  ⚠ @ignitify-integrations/telegram@1.x is obsolete: use 2.0.0          (design)
  @ignitify-integrations/telegram: secret TELEGRAM_WEBHOOK_SECRET is missing from secrets   (core)

$ ignitify integration:add telegram --task launch-event
@ignitify-integrations/telegram@2.0.0 · settings + code                (core)
  + secrets: TELEGRAM_WEBHOOK_SECRET
you add:                                                               (core)
  secret TELEGRAM_BOT_TOKEN: ignitify secret:set TELEGRAM_BOT_TOKEN --stdin
  secret TELEGRAM_WEBHOOK_SECRET: ignitify secret:set TELEGRAM_WEBHOOK_SECRET --stdin
Apply? [y/N] y

$ ignitify task:validate                                               (core) [] → all covered
```

## Open points found by this scenario

| #   | Point                                                                                            | State                                                      |
| :-- | :----------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| 1   | Task code could not get the viewer link before `stream()` returned                               | Fixed: `watchUrl(ctx)`                                     |
| 2   | "You add" lists every secret again, also secrets already set (the CLI cannot read secret values) | Open: the CLI can mark the names that are new in this plan |
| 3   | A recording uploaded with one presigned link per segment does not play as a whole                | Open: decide the tutorial's upload pattern (§5 notes)      |
