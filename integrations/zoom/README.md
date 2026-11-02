# zoom

> **Status:** draft — not published.

Let a task create Zoom meetings and read recordings and participants.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Zoom with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add zoom --task my-task
ignitify secret:set ZOOM_ACCOUNT_ID --stdin
ignitify secret:set ZOOM_CLIENT_ID --stdin
ignitify secret:set ZOOM_CLIENT_SECRET --stdin
```

The plan adds the secret names `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` and an egress network limited to `zoom.us`, `api.zoom.us`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Zoom docs](https://developers.zoom.us/docs/internal-apps/s2s-oauth/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "topic": "Weekly review", "start_time": "2026-11-03T10:00:00Z", "duration": 30 }
export async function run(payload, ctx) {
  const query = new URLSearchParams({ grant_type: 'account_credentials', account_id: ctx.secrets.ZOOM_ACCOUNT_ID });
  const tokenRes = await fetch(`https://zoom.us/oauth/token?${query}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.ZOOM_CLIENT_ID}:${ctx.secrets.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
    },
  });
  const { access_token } = await tokenRes.json();
  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: payload.topic, type: 2, start_time: payload.start_time, duration: payload.duration }),
  });
  if (!res.ok) throw new Error(`Zoom answered ${res.status}`);
  const meeting = await res.json();
  return { id: meeting.id, join_url: meeting.join_url };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Meetings from a calendar.** Create a meeting and put the link into a [`google-calendar`](../google-calendar/README.md) event.
- **Share the result.** Post the link to [`slack`](../slack/README.md) when it is ready.
- **Receive Zoom events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Zoom event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
