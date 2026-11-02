# datadog

> **Status:** draft — not published.

Let a task send metrics, events and logs to Datadog and read monitors.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Datadog with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add datadog --task my-task
ignitify secret:set DATADOG_API_KEY --stdin
ignitify secret:set DATADOG_APP_KEY --stdin
```

The plan adds the secret names `DATADOG_API_KEY`, `DATADOG_APP_KEY` and an egress network limited to `api.datadoghq.com`, `api.us3.datadoghq.com`, `api.us5.datadoghq.com`, `api.datadoghq.eu`, `api.ap1.datadoghq.com`, `http-intake.logs.datadoghq.com`, `http-intake.logs.datadoghq.eu`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Datadog docs](https://docs.datadoghq.com/api/latest/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "metric": "task.report.rows", "value": 42 }
export async function run(payload, ctx) {
  const res = await fetch('https://api.datadoghq.com/api/v2/series', {
    method: 'POST',
    headers: { 'DD-API-KEY': ctx.secrets.DATADOG_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      series: [
        {
          metric: payload.metric,
          type: 3,
          points: [{ timestamp: Math.floor(Date.now() / 1000), value: payload.value }],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Datadog answered ${res.status}`);
  return { sent: true };
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
- Use the host of your Datadog site (US1 is in the example).
