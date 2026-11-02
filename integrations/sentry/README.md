# sentry

> **Status:** draft — not published.

Let a task report task errors to Sentry and read issues.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Sentry with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add sentry --task my-task
ignitify secret:set SENTRY_DSN --stdin
ignitify secret:set SENTRY_AUTH_TOKEN --stdin
```

The plan adds the secret names `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` and an egress network limited to `sentry.io`, `us.sentry.io`, `de.sentry.io`. **You add** one more host to `execution.network.egress_allow`, because it is different for every tenant: the ingest host in your DSN, for example o123.ingest.us.sentry.io (or your self-hosted host).

Get the credentials first: [Sentry docs](https://docs.sentry.io/platforms/javascript/guides/node/).

## Use it

`npm install @sentry/node`, then:

```ts
import * as Sentry from '@sentry/node';

// Your task code.
const doTheWork = async (payload) => ({ ok: true });

// payload: {}
export async function run(payload, ctx) {
  Sentry.init({ dsn: ctx.secrets.SENTRY_DSN });
  try {
    return await doTheWork(payload);
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    await Sentry.flush(2000); // send before the run ends
  }
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Report task errors.** Send the error from the `catch` block of `run()`.
- **Page a person.** Trigger [`pagerduty`](../pagerduty/README.md) when a run fails twice in a row in the same run.
- **One metric for each run.** Send the duration and the item count of each run.

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
