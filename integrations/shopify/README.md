# shopify

> **Status:** draft — not published.

Let a task read and update Shopify orders, products and customers through the Admin API.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Shopify with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add shopify --task my-task
ignitify secret:set SHOPIFY_ACCESS_TOKEN --stdin
```

The plan adds the secret names `SHOPIFY_ACCESS_TOKEN` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your store host: `<store>.myshopify.com`.

Get the credentials first: [Shopify docs](https://shopify.dev/docs/api/admin-graphql).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "store": "my-store", "first": 10 }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.store}.myshopify.com/admin/api/2025-07/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': ctx.secrets.SHOPIFY_ACCESS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `{ orders(first: ${payload.first}) { nodes { id name } } }` }),
  });
  if (!res.ok) throw new Error(`Shopify answered ${res.status}`);
  return { orders: (await res.json()).data.orders.nodes };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Order digest.** Count yesterday's orders and post the numbers to [`slack`](../slack/README.md).
- **Low-stock alert.** Check inventory and send an SMS with [`twilio`](../twilio/README.md) when an item runs low.
- **Product copy.** Write product descriptions with [`openai`](../openai/README.md) and save them back.
- **Receive Shopify events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/README.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Shopify event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
