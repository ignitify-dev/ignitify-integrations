# pagerduty

> **Status:** draft — not published.

Let a task trigger and resolve PagerDuty incidents.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call PagerDuty with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add pagerduty --task my-task
ignitify secret:set PAGERDUTY_ROUTING_KEY --stdin
ignitify secret:set PAGERDUTY_API_TOKEN --stdin
```

The plan adds the secret names `PAGERDUTY_ROUTING_KEY`, `PAGERDUTY_API_TOKEN` and an egress network limited to `events.pagerduty.com`, `api.pagerduty.com`, `events.eu.pagerduty.com`, `api.eu.pagerduty.com`. There is nothing for you to add.

Get the credentials first: [PagerDuty docs](https://developer.pagerduty.com/docs/events-api-v2-overview).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "summary": "Nightly run failed", "source": "report-task" }
export async function run(payload, ctx) {
  const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routing_key: ctx.secrets.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      payload: { summary: payload.summary, source: payload.source, severity: 'error' },
    }),
  });
  if (!res.ok) throw new Error(`PagerDuty answered ${res.status}`);
  return { dedup_key: (await res.json()).dedup_key };
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
