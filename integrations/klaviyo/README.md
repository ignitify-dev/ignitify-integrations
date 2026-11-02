# klaviyo

> **Status:** draft — not published.

Let a task manage Klaviyo profiles, lists and events.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Klaviyo with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add klaviyo --task my-task
ignitify secret:set KLAVIYO_PRIVATE_API_KEY --stdin
```

The plan adds the secret names `KLAVIYO_PRIVATE_API_KEY` and an egress network limited to `a.klaviyo.com`. There is nothing for you to add.

Get the credentials first: [Klaviyo docs](https://developers.klaviyo.com/en/docs/authenticate_).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "email": "a@example.com" }
export async function run(payload, ctx) {
  const res = await fetch('https://a.klaviyo.com/api/profiles', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${ctx.secrets.KLAVIYO_PRIVATE_API_KEY}`,
      revision: '2024-10-15',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify({ data: { type: 'profile', attributes: { email: payload.email } } }),
  });
  if (!res.ok) throw new Error(`Klaviyo answered ${res.status}`);
  return { id: (await res.json()).data.id };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Sync an audience.** Add new [`hubspot`](../hubspot/README.md) contacts to a list here.
- **Daily spend report.** Read yesterday's numbers and append a row to [`google-sheets`](../google-sheets/README.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
