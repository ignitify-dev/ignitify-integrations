# google-ads

> **Status:** draft — not published.

Let a task read Google Ads campaign reports and manage campaigns.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Google Ads with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add google-ads --task my-task
ignitify secret:set GOOGLE_ADS_DEVELOPER_TOKEN --stdin
ignitify secret:set GOOGLE_CLIENT_ID --stdin
ignitify secret:set GOOGLE_CLIENT_SECRET --stdin
ignitify secret:set GOOGLE_REFRESH_TOKEN --stdin
```

The plan adds the secret names `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and an egress network limited to `oauth2.googleapis.com`, `googleads.googleapis.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Google Ads docs](https://developers.google.com/google-ads/api/docs/get-started/introduction).

## Use it

With plain `fetch` (no package to install):

```ts
// A new access token on each run, from the refresh token.
async function googleToken(s) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: s.GOOGLE_CLIENT_ID,
      client_secret: s.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: s.GOOGLE_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status}`);
  return (await res.json()).access_token;
}
// payload: { "customer_id": "1234567890", "query": "SELECT campaign.name, metrics.clicks FROM campaign WHERE segments.date DURING YESTERDAY" }
export async function run(payload, ctx) {
  const token = await googleToken(ctx.secrets);
  const res = await fetch(`https://googleads.googleapis.com/v21/customers/${payload.customer_id}/googleAds:search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'developer-token': ctx.secrets.GOOGLE_ADS_DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: payload.query }),
  });
  if (!res.ok) throw new Error(`Google Ads answered ${res.status}`);
  return { rows: ((await res.json()).results ?? []).length };
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
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
