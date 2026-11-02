# meta-ads

> **Status:** draft — not published.

Let a task read Meta (Facebook and Instagram) ad insights and manage campaigns.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Meta Ads with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add meta-ads --task my-task
ignitify secret:set META_ACCESS_TOKEN --stdin
```

The plan adds the secret names `META_ACCESS_TOKEN` and an egress network limited to `graph.facebook.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Meta Ads docs](https://developers.facebook.com/docs/marketing-apis/get-started).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "ad_account_id": "1234567890" }
export async function run(payload, ctx) {
  const query = new URLSearchParams({
    fields: 'campaign_name,spend,impressions',
    level: 'campaign',
    date_preset: 'yesterday',
  });
  const res = await fetch(`https://graph.facebook.com/v21.0/act_${payload.ad_account_id}/insights?${query}`, {
    headers: { Authorization: `Bearer ${ctx.secrets.META_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Meta answered ${res.status}`);
  return { rows: (await res.json()).data };
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
