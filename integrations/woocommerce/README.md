# woocommerce

> **Status:** draft — not published.

Let a task read and update WooCommerce orders and products.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call WooCommerce with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add woocommerce --task my-task
ignitify secret:set WOOCOMMERCE_CONSUMER_KEY --stdin
ignitify secret:set WOOCOMMERCE_CONSUMER_SECRET --stdin
```

The plan adds the secret names `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET` and an egress network. **You add** one host to `execution.network.egress_allow`, because it is different for every tenant: your store host, for example shop.example.com.

Get the credentials first: [WooCommerce docs](https://woocommerce.github.io/woocommerce-rest-api-docs/).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "store_host": "shop.example.com", "status": "processing" }
export async function run(payload, ctx) {
  const res = await fetch(`https://${payload.store_host}/wp-json/wc/v3/orders?status=${payload.status}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${ctx.secrets.WOOCOMMERCE_CONSUMER_KEY}:${ctx.secrets.WOOCOMMERCE_CONSUMER_SECRET}`).toString('base64')}`,
    },
  });
  if (!res.ok) throw new Error(`WooCommerce answered ${res.status}`);
  return { ids: (await res.json()).map((o) => o.id) };
}
```

The secrets come from `ctx.secrets`; add your host to `execution.network.egress_allow` (see Add it).

## Grow your task

- **Order digest.** Count yesterday's orders and post the numbers to [`slack`](../slack/README.md).
- **Low-stock alert.** Check inventory and send an SMS with [`twilio`](../twilio/README.md) when an item runs low.
- **Product copy.** Write product descriptions with [`openai`](../openai/README.md) and save them back.
- **Receive WooCommerce events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide, chapter 4 ([Inbound and webhooks](../../docs/guide/04-inbound-and-webhooks.md)).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a WooCommerce event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
