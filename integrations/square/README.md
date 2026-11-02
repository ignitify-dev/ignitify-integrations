# square

> **Status:** draft — not published.

Let a task read and create Square payments, orders and customers.

This integration is **settings only**. It has no code. It writes the settings your task needs, and you call Square with its own library or with `fetch`.

## Add it

```bash
ignitify integration:add square --task my-task
ignitify secret:set SQUARE_ACCESS_TOKEN --stdin
```

The plan adds the secret names `SQUARE_ACCESS_TOKEN` and an egress network limited to `connect.squareup.com`, `connect.squareupsandbox.com`. You add only the secret values (the `secret:set` lines above).

Get the credentials first: [Square docs](https://developer.squareup.com/docs/build-basics/access-tokens).

## Use it

With plain `fetch` (no package to install):

```ts
// payload: { "limit": 10 }
export async function run(payload, ctx) {
  const res = await fetch(`https://connect.squareup.com/v2/payments?limit=${payload.limit}`, {
    headers: { Authorization: `Bearer ${ctx.secrets.SQUARE_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Square answered ${res.status}`);
  return { ids: ((await res.json()).payments ?? []).map((p) => p.id) };
}
```

The secrets come from `ctx.secrets`, and the listed hosts are already allowed.

## Grow your task

- **Daily revenue report.** List yesterday's payments, add them up, and post the total to [`slack`](../slack/README.md).
- **Book payments.** Create the matching invoice or payment in [`quickbooks`](../quickbooks/README.md) or [`xero`](../xero/README.md).
- **Mail a receipt.** Send it with [`sendgrid`](../sendgrid/README.md) or [`resend`](../resend/README.md) after a payment succeeds.
- **Receive Square events.** A long-running task with a bidirectional network can receive webhooks on its own route today. See the guide: [Inbound and webhooks](../../docs/guide/inbound-and-webhooks.md).

## Limits

- **Draft: settings not verified yet.** The hosts, the secret names and the example are not tested in a real task. Check them against the vendor docs before you rely on them.
- The platform cannot yet **start** a run from a Square event. A task that receives webhooks must already be running.
- There is no state between runs, so a task cannot keep a sync cursor. Each run reads what it needs again.
- A task result is at most 10 KiB. Return ids and counts; put big data in [`s3-storage`](../s3-storage/README.md).
- Parallel runs do not share a rate limit. When the vendor answers `429`, wait as `Retry-After` says (most SDKs retry for you).
