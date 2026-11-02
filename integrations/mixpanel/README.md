# mixpanel

> **Status:** draft — not published.

Let a task send events to Mixpanel and query reports.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Mixpanel with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add mixpanel --task my-task
ignitify secret:set MIXPANEL_PROJECT_TOKEN --stdin
ignitify secret:set MIXPANEL_SERVICE_ACCOUNT_USERNAME --stdin
ignitify secret:set MIXPANEL_SERVICE_ACCOUNT_SECRET --stdin
```

The plan adds the secret names `MIXPANEL_PROJECT_TOKEN`, `MIXPANEL_SERVICE_ACCOUNT_USERNAME`, `MIXPANEL_SERVICE_ACCOUNT_SECRET` and an egress network limited to `api.mixpanel.com`, `api-eu.mixpanel.com`, `mixpanel.com`, `eu.mixpanel.com`, `data.mixpanel.com`. There is nothing for you to add.

Get the credentials first: [Mixpanel docs](https://docs.mixpanel.com/docs/tracking-methods/sdks/nodejs).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "event": "report_built", "distinct_id": "task-report" }
export async function run(payload, ctx) {
  const res = await fetch('https://api.mixpanel.com/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
    body: JSON.stringify([
      {
        event: payload.event,
        properties: { token: ctx.secrets.MIXPANEL_PROJECT_TOKEN, distinct_id: payload.distinct_id },
      },
    ]),
  });
  if (!res.ok) throw new Error(`Mixpanel answered ${res.status}`);
  return { accepted: (await res.text()) === '1' };
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
