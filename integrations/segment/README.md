# segment

> **Status:** draft — not published.

Let a task send track and identify calls to Segment.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Segment with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add segment --task my-task
ignitify secret:set SEGMENT_WRITE_KEY --stdin
```

The plan adds the secret names `SEGMENT_WRITE_KEY` and an egress network limited to `api.segment.io`, `events.eu1.segmentapis.com`. There is nothing for you to add.

Get the credentials first: [Segment docs](https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "user_id": "u-1", "event": "Report Built" }
export async function run(payload, ctx) {
  const res = await fetch('https://api.segment.io/v1/track', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.SEGMENT_WRITE_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: payload.user_id, event: payload.event }),
  });
  if (!res.ok) throw new Error(`Segment answered ${res.status}`);
  return { sent: true };
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
