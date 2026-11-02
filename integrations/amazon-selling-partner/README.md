# amazon-selling-partner

> **Status:** draft — not published.

Let a task read Amazon seller orders, inventory and reports.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Amazon Selling Partner API with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add amazon-selling-partner --task my-task
ignitify secret:set SP_API_CLIENT_ID --stdin
ignitify secret:set SP_API_CLIENT_SECRET --stdin
ignitify secret:set SP_API_REFRESH_TOKEN --stdin
```

The plan adds the secret names `SP_API_CLIENT_ID`, `SP_API_CLIENT_SECRET`, `SP_API_REFRESH_TOKEN` and an egress network limited to `api.amazon.com`, `sellingpartnerapi-na.amazon.com`, `sellingpartnerapi-eu.amazon.com`, `sellingpartnerapi-fe.amazon.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Amazon Selling Partner API docs](https://developer-docs.amazon.com/sp-api/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "marketplace_id": "ATVPDKIKX0DER", "created_after": "2026-10-01T00:00:00Z" }
export async function run(payload, ctx) {
  const tokenRes = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: ctx.secrets.SP_API_REFRESH_TOKEN,
      client_id: ctx.secrets.SP_API_CLIENT_ID,
      client_secret: ctx.secrets.SP_API_CLIENT_SECRET,
    }),
  });
  const { access_token } = await tokenRes.json();
  const query = new URLSearchParams({ MarketplaceIds: payload.marketplace_id, CreatedAfter: payload.created_after });
  const res = await fetch(`https://sellingpartnerapi-na.amazon.com/orders/v0/orders?${query}`, {
    headers: { 'x-amz-access-token': access_token },
  });
  if (!res.ok) throw new Error(`Selling Partner API answered ${res.status}`);
  return { ids: (await res.json()).payload.Orders.map((o) => o.AmazonOrderId) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Order digest.** Count yesterday's orders and post the numbers to [`slack`](../slack/README.md).
- **Low-stock alert.** Check inventory and send an SMS with [`twilio`](../twilio/README.md) when an item runs low.
- **Product copy.** Write product descriptions with [`openai`](../openai/README.md) and save them back.
- **Receive Amazon Selling Partner API events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Amazon Selling Partner API event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
- The task gets a new access token from the refresh token on each run. The platform does not store tokens for you.
