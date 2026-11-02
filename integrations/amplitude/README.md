# amplitude

> **Status:** draft — not published.

Let a task send events to Amplitude and export data.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Amplitude with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add amplitude --task my-task
ignitify secret:set AMPLITUDE_API_KEY --stdin
ignitify secret:set AMPLITUDE_SECRET_KEY --stdin
```

The plan adds the secret names `AMPLITUDE_API_KEY`, `AMPLITUDE_SECRET_KEY` and an egress network limited to `api2.amplitude.com`, `api.eu.amplitude.com`, `amplitude.com`, `analytics.eu.amplitude.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Amplitude docs](https://amplitude.com/docs/apis/analytics/http-v2).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "user_id": "task-report", "event_type": "report_built" }
export async function run(payload, ctx) {
  const res = await fetch('https://api2.amplitude.com/2/httpapi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: ctx.secrets.AMPLITUDE_API_KEY,
      events: [{ user_id: payload.user_id, event_type: payload.event_type }],
    }),
  });
  if (!res.ok) throw new Error(`Amplitude answered ${res.status}`);
  return { ingested: (await res.json()).events_ingested };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Track your tasks.** Send one event for each run (name, duration, result) and see usage in the dashboard.
- **Weekly metrics post.** Read a report and post the main numbers to [`slack`](../slack/README.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
